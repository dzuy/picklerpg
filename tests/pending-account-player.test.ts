import test from 'node:test';
import assert from 'node:assert/strict';
import {transferPendingAccountPlayer} from '../src/pending-account-player';
import {PENDING_ACCOUNT_PLAYER_KEY} from '../src/cloud-players';
import {newPlayer} from '../src/player-design';

function pendingStore(value:string|null){
 let current=value;
 return {getItem:(_key:string)=>current,removeItem:(key:string)=>{assert.equal(key,PENDING_ACCOUNT_PLAYER_KEY);current=null;}};
}
test('authentication transfers the exact guest character before removing the pending copy',async()=>{
 const player=newPlayer('guest-custom');player.name='My custom player';player.appearance.hair='#123456';player.handedness='left';
 const encoded=JSON.stringify(player),store=pendingStore(encoded);
 let saved=false;
 assert.equal(await transferPendingAccountPlayer(store,async received=>{
  assert.equal(store.getItem(PENDING_ACCOUNT_PLAYER_KEY),encoded);
  assert.deepEqual(received,player);saved=true;
 }),true);
 assert.equal(saved,true);assert.equal(store.getItem(PENDING_ACCOUNT_PLAYER_KEY),null);
});
test('failed transfers retain the design and can be retried',async()=>{
 const player=newPlayer('guest-custom'),encoded=JSON.stringify(player),store=pendingStore(encoded);
 await assert.rejects(transferPendingAccountPlayer(store,async()=>{throw Error('offline');}),/offline/);
 assert.equal(store.getItem(PENDING_ACCOUNT_PLAYER_KEY),encoded);
 await transferPendingAccountPlayer(store,async received=>{assert.deepEqual(received,player);});
 assert.equal(store.getItem(PENDING_ACCOUNT_PLAYER_KEY),null);
});
test('accounts without a guest character keep the normal starter flow',async()=>{
 assert.equal(await transferPendingAccountPlayer(pendingStore(null),async()=>{assert.fail('No character should be imported');}),false);
});
