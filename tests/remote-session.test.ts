import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteSession,type Transport} from '../src/multiplayer/match-session';
import {RemoteError} from '../src/multiplayer/api';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action,MemoryRepository} from './helpers/remote';
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}};}
test('lost response persists same action across reload and cannot double score',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation()),store=storage();let lost=true;
 const request:Transport=async<T>(_token:string,_path:string,body?:unknown)=>{if(body){const result=await service.act(s.id,A,body);if(lost){lost=false;throw new Error('Lost response')}return result as T;}return await service.get(s.id,A) as T;};
 let client=new RemoteSession(A,s.id,async()=>({owner:A,token:'test'}),request,store);await client.refresh();await client.submit(s.choices[0]);assert.ok(client.pending);assert.equal(db.receipts.size,1);
 const id=client.pending.actionId;client=new RemoteSession(A,s.id,async()=>({owner:A,token:'test'}),request,store);assert.equal(client.pending!.actionId,id);await client.retry();assert.equal(client.pending,null);assert.equal(db.receipts.size,1);assert.equal(client.state!.version,1);
});
test('pending turns survive expired auth, are isolated by account, and storage failure prevents POST',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation()),store=storage();let posts=0,owner=A;
 const request:Transport=async<T>(_t,_p,body)=>{if(body){posts++;throw new RemoteError(401,'authentication','Expired');}return s as T;};
 const c=new RemoteSession(A,s.id,async()=>({owner,token:'t'}),request,store);await c.refresh();await c.submit(s.choices[0]);assert.ok(c.pending);
 const other=new RemoteSession(B,s.id,async()=>({owner:B,token:'t'}),request,store);assert.equal(other.pending,null);assert.equal(other.state,null);
 owner=B;await c.retry();assert.equal(posts,1);assert.equal(c.state,null);
 const failing=new RemoteSession(A,s.id,async()=>({owner:A,token:'t'}),request,{...storage(),setItem:()=>{throw new Error('quota')}});await failing.refresh();await assert.rejects(failing.submit(s.choices[0]),/quota/);assert.equal(posts,1);
});
test('an old exact receipt never replaces a newer checkpoint',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation()),store=storage(),first=action(s),receipt=await service.act(s.id,A,first);
 let next=receipt.state;const actor=next.currentTeam==='home'?A:B;next=await service.get(s.id,actor);await service.act(s.id,actor,action(next));const latest=await service.get(s.id,A);
 store.setItem(`pickle-remote:${A}:${s.id}:pending`,JSON.stringify(first));store.setItem(`pickle-remote:${A}:${s.id}:cache`,JSON.stringify(latest));
 const client=new RemoteSession(A,s.id,async()=>({owner:A,token:'t'}),async<T>(_t,_p,b)=>(b?receipt:latest) as T,store);await client.retry();assert.equal(client.state!.version,2);assert.equal(client.pending,null);
});
test('a refresh during credential recovery cannot reapply a choice to a newer decision',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers);let latest=await service.create(A,creation()),pause=false,posts=0;
 let release!:()=>void;
 const credentials=async()=>{if(pause){pause=false;await new Promise<void>(resolve=>{release=resolve});}return {owner:A,token:'t'}};
 const client=new RemoteSession(A,latest.id,credentials,async<T>(_t,_p,body)=>{if(body)posts++;return latest as T;},storage());
 await client.refresh();pause=true;const submission=client.submit(latest.choices[0]);
 latest=(await service.act(latest.id,A,action(latest))).state;await client.refresh();release();
 await assert.rejects(submission,/decision changed/);assert.equal(posts,0);assert.equal(client.pending,null);
});
