import {pgInvitations} from './helpers/invitations';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,testers,action} from './helpers/remote';
import {InvitationService,type InviteRepository,type InviteRow} from '../server/multiplayer/invitations';
import {MatchService} from '../server/multiplayer/service';
test('invitations require recipient acceptance, preserve creator team, and atomically start recipient serve',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);const repo=new PgRepository(db.pool);
 const invites=pgInvitations(repo);
 const matches=new MatchService(repo,testers),service=new InvitationService(invites,matches,testers),roster=creation().roster;
 const input={requestId:randomUUID(),opponentId:B,team:[roster.you,roster.partner],court:'forest',scoring:'rally-doubles'};
 const inv=await service.create(A,input);assert.equal(inv.status,'pending');assert.deepEqual(await service.create(A,input),inv);assert.equal((await matches.list(A)).length,0);
 await assert.rejects(service.accept(inv.id,A,{team:[roster['opponent-left'],roster['opponent-right']]}));await assert.rejects(service.get(inv.id,C));
 const accept={team:[roster['opponent-left'],roster['opponent-right']]};
 const [first,second]=await Promise.all([service.accept(inv.id,B,accept),service.accept(inv.id,B,accept)]);assert.deepEqual(first,second);
 assert.equal(first.viewerTeam,'home');assert.equal(first.currentTeam,'home');assert.equal(first.server,'you');assert.equal(first.accountIds?.home,B);assert.equal(first.accountIds?.away,A);
 assert.equal(first.roster['opponent-left'].id,roster.you.id);assert.equal(first.roster.you.id,roster['opponent-left'].id);
 assert.equal((await matches.list(A)).length,1);assert.equal((await service.get(inv.id,B)).status,'accepted');
 await assert.rejects(service.accept(inv.id,B,{team:[roster.you,roster.partner]}));
 const waiting=await matches.get(first.id,A);assert.equal(waiting.choices.length,0);await assert.rejects(matches.act(first.id,A,action(first)));
 await matches.act(first.id,B,action(first));
 }finally{await db.close()}
});
