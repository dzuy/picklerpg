import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountPlayerRow,accountStateForUser,mergePlayerLibraries,playerFromRow} from '../src/cloud-players';
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

test('a player transferred after sign-in is added without replacing the existing active player',()=>{
 const player={...newPlayer('new-roster-player'),name:'Dink Ninja'};
 const row=accountPlayerRow('existing-account',player);
 assert.equal(row.owner_id,'existing-account');assert.equal(row.id,player.id);assert.equal(row.name,'Dink Ninja');assert.equal(row.is_active,false);
});

test('an imported guest character can be selected as the account player without changing its design',()=>{
 const player=newPlayer('guest-custom');player.appearance.hair='#123456';player.handedness='left';
 const row=accountPlayerRow('signed-in-account',player,true);
 assert.equal(row.is_active,true);assert.equal(row.owner_id,'signed-in-account');
 assert.deepEqual(row.appearance,player.appearance);assert.deepEqual(row.skills,player.skills);assert.equal(row.handedness,'left');
});

test('guest transfer saves alongside the active signup starter before switching selection',async()=>{
 const {saveTransferredAccountPlayer}=await import('../src/cloud-players');
 const existing=accountPlayerRow('account',newPlayer('starter'),true);
 const unrelated=accountPlayerRow('other-account',newPlayer('other-player'),true);
 const rows=[existing,unrelated];
 const db:any={from:(table:string)=>{
  assert.equal(table,'players');
  return {
   async upsert(row:typeof existing){
    if(row.is_active&&rows.some(p=>p.owner_id===row.owner_id&&p.is_active&&p.id!==row.id))return {error:{code:'23505'}};
    const index=rows.findIndex(p=>p.owner_id===row.owner_id&&p.id===row.id);
    if(index<0)rows.push(row);else rows[index]=row;
    return {error:null};
   },
   update(values:{is_active:boolean}){
    const filters:Record<string,string>={};
    const query={eq(key:string,value:string){filters[key]=value;return query;},then(resolve:(result:{error:unknown})=>void){
     const affected=rows.filter(row=>Object.entries(filters).every(([key,value])=>(row as any)[key]===value));
     if(values.is_active&&affected.some(row=>rows.some(other=>other.owner_id===row.owner_id&&other.id!==row.id&&other.is_active))){resolve({error:{code:'23505'}});return;}
     for(const row of affected)row.is_active=values.is_active;
     resolve({error:null});
    }};return query;
   }
  };
 }};
 const edited=newPlayer('custom-guest');edited.appearance.hair='#123456';
 await saveTransferredAccountPlayer(db,'account',edited);
 assert.equal(existing.is_active,false);
 assert.equal(unrelated.is_active,true);
 const imported=rows.find(p=>p.id===edited.id)!;
 assert.equal(imported.is_active,true);assert.deepEqual(imported.appearance,edited.appearance);
 assert.equal(rows.filter(p=>p.owner_id==='account'&&p.is_active).length,1);
 // A retry updates the same character instead of adding another one.
 await saveTransferredAccountPlayer(db,'account',edited);
 assert.equal(rows.filter(p=>p.owner_id==='account').length,2);
});

test('a failed character save leaves the original active player selected',async()=>{
 const {saveTransferredAccountPlayer}=await import('../src/cloud-players');
 const db:any={from:()=>({upsert:async()=>({error:{code:'offline'}}),update:()=>assert.fail('Must not deselect the starter before saving the character')})};
 await assert.rejects(saveTransferredAccountPlayer(db,'account',newPlayer('custom-guest')),/could not be added/);
});
