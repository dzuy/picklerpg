import {pgInvitations} from './helpers/invitations';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {A,B,C,creation,testers,action} from './helpers/remote';
import {InvitationService,type InviteRepository,type InviteRow} from '../server/multiplayer/invitations';
import {MatchService} from '../server/multiplayer/service';
for(const court of ['venice','arizona','city','glowball','jungle'] as const)test(`invitations preserve ${court} through acceptance and turns`,async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);const repo=new PgRepository(db.pool);
 const invites=pgInvitations(repo);
 const matches=new MatchService(repo,testers),service=new InvitationService(invites,matches,testers),roster=creation().roster;
 const input={requestId:randomUUID(),opponentId:B,team:[roster.you,roster.partner],court,scoring:'rally-doubles',target:7};
 for(const target of [0,100,2.5,null,'7'])await assert.rejects(service.create(A,{...input,target}));
 const inv=await service.create(A,input);assert.equal(inv.target,7);assert.equal(inv.status,'pending');assert.deepEqual(await service.create(A,input),inv);assert.equal((await matches.list(A)).length,0);
 await assert.rejects(service.accept(inv.id,A,{team:[roster['opponent-left'],roster['opponent-right']]}));await assert.rejects(service.get(inv.id,C));
 const accept={team:[roster['opponent-left'],roster['opponent-right']]};
 const [first,second]=await Promise.all([service.accept(inv.id,B,accept),service.accept(inv.id,B,accept)]);assert.deepEqual(first,second);
 assert.equal(first.rules.target,7);assert.equal(first.court,court);assert.equal(first.viewerTeam,'home');assert.equal(first.currentTeam,'home');assert.equal(first.server,'you');assert.equal(first.accountIds?.home,B);assert.equal(first.accountIds?.away,A);
 assert.equal(first.roster['opponent-left'].id,roster.you.id);assert.equal(first.roster.you.id,roster['opponent-left'].id);
 assert.equal((await matches.list(A)).length,1);assert.equal((await service.get(inv.id,B)).status,'accepted');
 await assert.rejects(service.accept(inv.id,B,{team:[roster.you,roster.partner]}));
 const waiting=await matches.get(first.id,A);assert.equal(waiting.choices.length,0);await assert.rejects(matches.act(first.id,A,action(first)));
 const moved=await matches.act(first.id,B,action(first));assert.equal(moved.state.rules.target,7);assert.equal(moved.state.court,court);assert.equal((await matches.get(first.id,A)).court,court);
 }finally{await db.close()}
});

test('decline, sender dismissal, cancellation and acceptance races preserve invitation ownership',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);const repo=new PgRepository(db.pool),matches=new MatchService(repo,testers),invites=pgInvitations(repo),service=new InvitationService(invites,matches,testers),r=creation().roster;
 const create=()=>service.create(A,{requestId:randomUUID(),opponentId:B,team:[r.you,r.partner],court:'forest',scoring:'rally-doubles'});
 const team={team:[r['opponent-left'],r['opponent-right']]};
 const declined=await create();await assert.rejects(service.close(declined.id,A,'decline'));await assert.rejects(service.close(declined.id,C,'cancel'));await assert.rejects(service.close(declined.id,B,'delete'));
 assert.equal((await service.close(declined.id,B,'decline')).status,'declined');assert.equal((await service.close(declined.id,B,'decline')).status,'declined');
 assert.equal((await service.list(B)).length,0);assert.equal((await service.list(A))[0].status,'declined');await assert.rejects(service.accept(declined.id,B,team));
 await service.close(declined.id,A,'delete');await service.close(declined.id,A,'delete');assert.equal((await service.list(A)).length,0);
 const cancelled=await create();await assert.rejects(service.close(cancelled.id,B,'cancel'));await service.close(cancelled.id,A,'cancel');await service.close(cancelled.id,A,'cancel');await assert.rejects(service.accept(cancelled.id,B,team));assert.equal((await service.list(B)).length,0);
 for(const action of ['cancel','decline'] as const){const invite=await create();const results=await Promise.allSettled([service.accept(invite.id,B,team),service.close(invite.id,action==='cancel'?A:B,action)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const current=await service.get(invite.id,A);assert.equal(!!(await matches.list(A)).find(m=>m.id===invite.id),current.status==='accepted');}
 }finally{await db.close()}
});
