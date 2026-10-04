import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import * as THREE from 'three';
import {disposeAthlete} from '../src/athlete';
import {BoundedImageCache} from '../src/bounded-image-cache';
import {CloudPlayerSync} from '../src/cloud-players';
import {browserStorage} from '../src/browser-storage';
import {RosterOutbox} from '../src/roster-outbox';
import {newPlayer} from '../src/player-design';
import {configuredOpponentAccess,opponentAccess} from '../server/multiplayer/opponent-access';
import {createMatchHandler} from '../server/multiplayer/routes';
import {A} from './helpers/remote';
import {memoryRateLimits} from '../server/multiplayer/rate-limit';
// @ts-ignore server JS
import {createOpponentHandler} from '../server/opponent.mjs';

test('paid requests fail closed, permit verified guests, and exhaust shared sequential budgets',async()=>{
 let calls=0,authCalls=0;
 const limits=memoryRateLimits(()=>1000);
 const access=opponentAccess(async token=>{authCalls++;return token.startsWith('guest')?token:null;},limits);
 const handler=createOpponentHandler({authorize:access,choose:async()=>{calls++;return {choice:0};}});
 const request=async(token?:string,fn=handler)=>{
  const req:any=Readable.from([Buffer.from('{"version":1,"options":[{}]}')]);req.method='POST';req.url='/api/opponent';req.headers=token?{authorization:`Bearer ${token}`}:{ };req.socket={remoteAddress:'127.0.0.1'};
  let status=0;const headers:Record<string,string>={};const res:any={setHeader(k:string,v:string){headers[k]=v},writeHead(s:number){status=s;return this},end(){}};
  await fn(req,res);return {status,headers};
 };
 assert.equal((await request()).status,401);assert.equal(authCalls,0);
 assert.equal((await request('bad')).status,401);assert.equal(calls,0);
 for(let i=0;i<60;i++)assert.equal((await request('guest-a')).status,200);
 assert.equal((await request('guest-a')).status,429);assert.equal(calls,60);
 assert.equal((await request('guest-b')).status,200);
 assert.equal((await request('guest-b',createOpponentHandler({choose:async()=>{throw Error('must not run')}}))).status,401);
 const second=opponentAccess(async()=> 'guest-a',limits);
 await assert.rejects(second({headers:{authorization:'Bearer valid'},socket:{remoteAddress:'other'}} as any),e=>(e as any).status===429);
});

test('failed cloud edit stays pending and is retried before a later edit is acknowledged',async()=>{
 browserStorage.clear();const states:string[]=[],writes:string[]=[];let failed=false;
 const sync:any=new CloudPlayerSync(s=>states.push(s));sync.ownerId='account';sync.client={rpc:async(_name:string,{p_change}:any)=>{writes.push(p_change.change.playerId);if(!failed){failed=true;return {error:Error('offline')}}return {error:null}}};
 const library={version:1 as const,activeId:null,players:[newPlayer('a'),newPlayer('b')]};
 sync.save(library,{kind:'save',playerId:'a'});await sync.queue;
 assert.equal(new RosterOutbox(browserStorage,'account').pending().length,1);
 sync.save(library,{kind:'save',playerId:'b'});await sync.queue;
 assert.deepEqual(writes,['a','a','b']);assert.equal(new RosterOutbox(browserStorage,'account').pending().length,0);
 assert.equal(browserStorage.getItem('pickle-rpg-cloud-dirty-v1'),null);assert.equal(states.at(-1),'saved');
});

test('offline deletion survives recreation and acknowledgement cannot remove a concurrent operation',()=>{
 browserStorage.clear();const first=new RosterOutbox(browserStorage,'a');
 const deleted=first.enqueue({version:1,activeId:null,players:[]},{kind:'delete',playerId:'gone'});
 const reloaded=new RosterOutbox(browserStorage,'a');assert.equal(reloaded.pending()[0].change.kind,'delete');
 const another=reloaded.enqueue({version:1,activeId:null,players:[newPlayer('new')]},{kind:'save',playerId:'new'});
 first.acknowledge(deleted);assert.deepEqual(first.pending().map(o=>o.id),[another.id]);
 assert.equal(new RosterOutbox(browserStorage,'b').pending().length,0);
});

test('athlete disposal releases shared instance skeleton once and keeps shared base geometry',()=>{
 const root=new THREE.Group(),geometry=new THREE.BufferGeometry(),skeleton=new THREE.Skeleton([new THREE.Bone()]);skeleton.computeBoneTexture();
 let disposed=0,geometryDisposed=0;skeleton.boneTexture!.addEventListener('dispose',()=>disposed++);geometry.addEventListener('dispose',()=>geometryDisposed++);
 for(let i=0;i<2;i++){const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());mesh.skeleton=skeleton;root.add(mesh);}
 disposeAthlete(root);assert.equal(disposed,1);assert.equal(skeleton.boneTexture,null);assert.equal(geometryDisposed,0);geometry.dispose();
});

test('thumbnail cache evicts least recently used images and rejects oversized entries',()=>{
 const cache=new BoundedImageCache(100,2);cache.set('a','one');cache.set('b','two');assert.equal(cache.get('a'),'one');cache.set('c','three');
 assert.equal(cache.has('b'),false);assert.equal(cache.size,2);cache.set('large','x'.repeat(100));assert.equal(cache.size,2);
 for(let i=0;i<10000;i++)cache.set(String(i),'image');assert.equal(cache.size,2);cache.clear();assert.equal(cache.size,0);
});


test('edits during roster connection remain queued until the connection can reconcile them',()=>{
 browserStorage.clear();const states:string[]=[];
 const sync:any=new CloudPlayerSync(s=>states.push(s));sync.ownerId='account';sync.connecting=true;sync.client={rpc:()=>{throw Error('A connection snapshot must not race a player mutation')}};
 const library={version:1 as const,activeId:null,players:[newPlayer('edited')]};
 sync.save(library,{kind:'save',playerId:'edited'});
 assert.equal(new RosterOutbox(browserStorage,'account').pending().length,1);
 assert.equal(browserStorage.getItem('pickle-rpg-cloud-dirty-v1'),'1');assert.equal(states.at(-1),'offline');
});


test('paid budgets bound global use across accounts and pre-authentication work and fail closed on outages',async()=>{
 const limits=memoryRateLimits(()=>1000);let authCalls=0;
 const access=opponentAccess(async token=>{authCalls++;return token;},limits);
 const req=(token:string,address:string)=>({headers:{authorization:`Bearer ${token}`},socket:{remoteAddress:address}} as any);
 for(let i=0;i<300;i++)await access(req(`account-${i}`,`network-${i}`));
 await assert.rejects(access(req('another','another')),e=>(e as any).status===429);
 const preAuth=opponentAccess(async()=>{authCalls++;return null},memoryRateLimits(()=>1000));
 for(let i=0;i<300;i++)await assert.rejects(preAuth(req('bad','same-network')),e=>(e as any).status===401);
 const before=authCalls;await assert.rejects(preAuth(req('bad','same-network')),e=>(e as any).status===429);assert.equal(authCalls,before);
 await assert.rejects(configuredOpponentAccess({})(req('guest','network')),e=>(e as any).status===503);
 await assert.rejects(opponentAccess(async()=>{throw Error('Authentication unavailable')},limits)(req('valid','new-network')),/Authentication unavailable/);
 await assert.rejects(opponentAccess(async()=>A,async()=>{throw Error('Limiter unavailable')})(req('valid','new-network')),/Limiter unavailable/);
});

test('game reads remain available when account-directory discovery fails',async()=>{
 let scans=0,reads=0;const service:any={get:async()=>{reads++;return {id:A}},config:()=>({selfId:A})};
 const handler=createMatchHandler(service,async()=>A,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,async()=>0,0,undefined,undefined,async()=>{scans++;throw Error('Directory unavailable')});
 const request=async(url:string)=>{const req:any={method:'GET',url,headers:{authorization:'Bearer test'},socket:{remoteAddress:'local'}};let status=0;const res:any={writeHead(s:number){status=s;return this},end(){}};await handler(req,res);return status;};
 assert.equal(await request(`/api/matches/${A}`),200);assert.equal(scans,0);
 assert.equal(await request('/api/multiplayer/config'),503);assert.equal(scans,1);
 assert.equal(await request(`/api/matches/${A}`),200);assert.equal(reads,2);assert.equal(scans,1);
});
