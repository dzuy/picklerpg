import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTeamName,teamDisplayName} from '../src/team-name';
import {accountStateForUser,CloudPlayerSync} from '../src/cloud-players';
test('team names default to the account player name and support a custom name or reset',()=>{
 assert.equal(teamDisplayName('Dzuy'),'Team Dzuy');
 assert.equal(teamDisplayName('Dzuy','Kitchen Crew'),'Kitchen Crew');
 assert.equal(teamDisplayName('Luna',''),'Team Luna');
 assert.equal(normalizeTeamName('  Kitchen   Crew '),'Kitchen Crew');
 assert.equal(normalizeTeamName('  '),'');
 assert.throws(()=>normalizeTeamName('x'.repeat(49)),/48/);
 assert.equal(accountStateForUser({is_anonymous:false,user_metadata:{player_name:'Dzuy',team_name:'Kitchen Crew'}}).teamName,'Kitchen Crew');
});
test('saving and resetting team names update account metadata; failures are reported',async()=>{
 let payload:any;const sync=new CloudPlayerSync();
 (sync as any).ownerId='owner';(sync as any).client={auth:{updateUser:async(value:any)=>{payload=value;return {data:{user:{is_anonymous:false,user_metadata:value.data}},error:null}}}};
 assert.equal(await sync.saveTeamName('  Kitchen Crew  '),'Kitchen Crew');assert.deepEqual(payload,{data:{team_name:'Kitchen Crew'}});
 assert.equal(await sync.saveTeamName(''),'');assert.deepEqual(payload,{data:{team_name:null}});
 (sync as any).client.auth.updateUser=async()=>({error:Error('offline')});
 await assert.rejects(sync.saveTeamName('Team'),/Could not save/);
});
