import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {pgInvitations} from './helpers/invitations';
import {A,B,C,creation,testers,action} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {InvitationService} from '../server/multiplayer/invitations';

for(const first of [A,B,null])test(`shared rematch: ${first===null?'both players':first===A?'home':'away'} request first; simultaneous taps create one match`,async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 let repo=new PgRepository(db.pool),matches=new MatchService(repo,testers),invites=new InvitationService(pgInvitations(repo),matches,testers);
 let source=await matches.create(A,creation());await assert.rejects(invites.rematch(source.id,A),/Finish this game/);
 for(let n=0;n<600&&source.status!=='completed';n++){const actor=source.currentTeam==='home'?A:B;source=await matches.get(source.id,actor);source=(await matches.act(source.id,actor,action(source,n))).state;}
 assert.equal(source.status,'completed');const before=await repo.get(source.id,A);
 await assert.rejects(invites.rematch(source.id,C));
 const pending=first?await invites.rematch(source.id,first):(await Promise.all([invites.rematch(source.id,A),invites.rematch(source.id,B)]))[0];if(first){assert.equal(pending.matchId,null);assert.deepEqual(await invites.rematch(source.id,first),pending);assert.equal((await matches.list(A)).length,1);}
 const results=await Promise.all(Array.from({length:12},(_,index)=>invites.rematch(source.id,index%2?A:B)));
 assert.ok(results.every(r=>r.invitationId===pending.invitationId));const completed=await invites.rematch(source.id,A);assert.equal(completed.matchId,pending.invitationId);assert.deepEqual(await invites.rematch(source.id,B),completed);
 assert.equal((await matches.list(A)).length,2);assert.equal((await matches.list(B)).length,2);
 assert.equal((await db.pool.query('select count(*) from public.async_invitations where rematch_of=$1',[source.id])).rows[0].count,1);
 const next=await matches.get(completed.matchId!,A);assert.deepEqual(next.score,{home:0,away:0});assert.equal(next.rules.scoring,source.rules.scoring);assert.deepEqual(await repo.get(source.id,A),before);
 await db.restart();repo=new PgRepository(db.pool);matches=new MatchService(repo,testers);invites=new InvitationService(pgInvitations(repo),matches,testers);assert.deepEqual(await invites.rematch(source.id,B),completed);
 const connection=await db.pool.connect();try{await connection.query('set role authenticated');await assert.rejects(connection.query('select public.create_async_rematch($1,$2,$3)',[source.id,C,{}]),/permission denied/);}finally{await connection.query('reset role');connection.release();}
 }finally{await db.close();}
});
