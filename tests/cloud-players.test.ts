import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountStateForUser,mergePlayerLibraries,playerFromRow} from '../src/cloud-players';
import {newPlayer,type PlayerLibrary} from '../src/player-design';

test('cloud merge retains cloud-only players and gives local edits precedence',()=>{
 const cloudOnly={...newPlayer('cloud'),name:'Cloud'};
 const remoteVersion={...newPlayer('shared'),name:'Old name'};
 const localVersion={...remoteVersion,name:'New name'};
 const local:PlayerLibrary={version:1,activeId:'shared',players:[localVersion]};
 const remote:PlayerLibrary={version:1,activeId:'cloud',players:[cloudOnly,remoteVersion]};
 const merged=mergePlayerLibraries(local,remote);
 assert.deepEqual(merged.players.map(player=>player.id),['cloud','shared']);
 assert.equal(merged.players.find(player=>player.id==='shared')?.name,'New name');
 assert.equal(merged.activeId,'shared');
});

test('cloud active player is used when local storage has no selection',()=>{
 const player=newPlayer('cloud');
 assert.equal(mergePlayerLibraries({version:1,activeId:null,players:[]},{version:1,activeId:'cloud',players:[player]}).activeId,'cloud');
});

test('account state distinguishes guests from protected accounts',()=>{
 assert.deepEqual(accountStateForUser({email:undefined,is_anonymous:true}),{kind:'guest'});
 assert.deepEqual(accountStateForUser({email:'player@example.com',is_anonymous:false}),{kind:'authenticated',email:'player@example.com'});
});

test('saved roster players normalize empty database catchphrases before validation',()=>{
 const row={...newPlayer('saved-ryan'),name:'Ryan',is_active:true,is_public:false};
 for(const catchphrase of [null,'']){const player=playerFromRow({...row,catchphrase});assert.equal(player.name,'Ryan');assert.equal(player.catchphrase,undefined);}
 assert.equal(playerFromRow({...row,catchphrase:'Nice shot!'}).catchphrase,'Nice shot!');
 assert.throws(()=>playerFromRow({...row,catchphrase:'x'.repeat(31)}),/catchphrase/);
});
