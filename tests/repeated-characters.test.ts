import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {SLOTS} from '../src/engine/checkpoint';
import {setupLineup,validLineup} from '../src/match-setup-state';
import {MatchService} from '../server/multiplayer/service';
import {InvitationService} from '../server/multiplayer/invitations';
import {database,PgRepository} from './helpers/postgres';
import {pgInvitations} from './helpers/invitations';
import {A,B,testers,action} from './helpers/remote';

test('four identical designs keep independent court positions, skills, and checkpoint slots',()=>{
 const character=newPlayer('same');character.skills.movement=92;
 const selection=setupLineup([character],[character,character,character,character]);
 assert.deepEqual(selection.selected,['same','same','same','same']);assert.ok(validLineup(['same'],selection.selected));
 const roster=Object.fromEntries(SLOTS.map(id=>[id,character])) as Parameters<Match['startLocalHumanMatch']>[0];
 for(const mode of ['solo','multi']){
  const m=new Match();if(mode==='multi')m.startLocalHumanMatch(roster);else{for(const id of SLOTS)m.substitutePlayer(id,character);m.reset();}
  assert.deepEqual(m.state.players.map(p=>p.id),SLOTS);assert.equal(new Set(m.state.players.map(p=>JSON.stringify(p.position))).size,4);
  const restored=Match.fromCheckpoint(m.exportCheckpoint());for(const id of SLOTS)assert.equal(restored.getPlayerDesign(id)!.id,'same');
  m.state.players[0].skills.movement=10;assert.equal(m.state.players[1].skills.movement,92);assert.equal(character.skills.movement,92);
 }
});
test('invitations accept four copies, complete the match, and save repeated history participants',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const repo=new PgRepository(db.pool),matches=new MatchService(repo,testers),invites=new InvitationService(pgInvitations(repo),matches,testers),p=newPlayer('same');
  const team=[p,p],inv=await invites.create(A,{requestId:randomUUID(),opponentId:B,team,court:'forest',scoring:'rally-doubles'});
  let state=await invites.accept(inv.id,B,{team});assert.ok(Object.values(state.roster).every(p=>p.id==='same'));
  for(let turn=0;turn<600&&state.status!=='completed';turn++){
   const owner=state.accountIds![state.currentTeam!]!;state=await matches.get(state.id,owner);state=(await matches.act(state.id,owner,action(state,turn))).state;
  }
  assert.equal(state.status,'completed');
  const participants=SLOTS.map(id=>({player_id:p.id,name:p.name,team:id==='you'||id==='partner'?'home':'away'}));
  const c=await db.pool.connect();try{
   await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
   await c.query('select public.record_match_players($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),'Same & Same','Same & Same',11,7,false,JSON.stringify(participants)]);
   const saved=await c.query('select participants from public.match_history');assert.deepEqual(saved.rows[0].participants,participants);
  }finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
