import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,savePlayer,parseLibrary} from '../src/player-design';
import {RosterOutbox} from '../src/roster-outbox';
import {CloudPlayerSync} from '../src/cloud-players';
import {browserStorage} from '../src/browser-storage';

test('consecutive offline edits require the preceding save to succeed',()=>{
 browserStorage.clear();
 const initial={...newPlayer('a'),revision:5};
 let library=savePlayer(browserStorage,{version:1,activeId:'a',players:[initial]},initial);
 const outbox=new RosterOutbox(browserStorage,'account');
 const first=outbox.enqueue(library,{kind:'save',playerId:'a'});
 library=savePlayer(browserStorage,library,{...library.players[0],name:'Second edit'});
 const second=outbox.enqueue(library,{kind:'save',playerId:'a'});
 assert.equal(first.expectedRevision,5);assert.equal(second.expectedRevision,6);
 assert.equal(second.previousOperation,first.id);
 assert.equal(parseLibrary(browserStorage.getItem('pickle-rpg-players-v1')).players[0].saveOperation,second.id);
});

test('rejected edits are kept for recovery while unrelated saves can sync',async()=>{
 browserStorage.clear();const states:string[]=[];
 const sync:any=new CloudPlayerSync(s=>states.push(s));sync.ownerId='account';
 sync.client={rpc:async(_name:string,{p_change}:any)=>({error:p_change.change.playerId==='a'?{code:'P0001',message:'This player changed elsewhere.'}:null})};
 const library={version:1 as const,activeId:null,players:[newPlayer('a'),newPlayer('b')]};
 sync.save(library,{kind:'save',playerId:'a'});await sync.queue;
 const key=Array.from({length:browserStorage.length},(_,i)=>browserStorage.key(i)!).find(k=>k.startsWith('pickle-roster-conflict-v1:account:'))!;
 assert.equal(JSON.parse(browserStorage.getItem(key)!).player.name,'New player');
 sync.save(library,{kind:'save',playerId:'b'});await sync.queue;
 assert.equal(new RosterOutbox(browserStorage,'account').pending().length,0);
 assert.equal(states.at(-1),'conflict');assert.ok(browserStorage.getItem(key));
});
