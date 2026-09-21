import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInviteLab,A,B} from './helpers/invite-lab';
import {action} from './helpers/remote';
test('lab invitation joins isolated players, starts with recipient serve, and appears in both game lists',async()=>{
 const lab=createInviteLab(),guest=lab.guest();
 const invite=await lab.friends.create(A,{name:'Bob'});
 assert.equal((await lab.service.list(guest)).length,0);
 const game=await lab.friends.accept(invite.token,guest);
 const state=await lab.service.get(game.matchId,guest);
 assert.equal(state.viewerTeam,'away');assert.equal(state.currentTeam,'away');assert.equal(state.serving,true);
 await lab.service.act(game.matchId,guest,action(state));
 assert.equal((await lab.service.get(game.matchId,A)).version,1);
 assert.equal((await lab.service.list(A))[0].id,game.matchId);
 assert.equal((await lab.service.list(guest))[0].id,game.matchId);
 assert.deepEqual(await lab.friends.accept(invite.token,guest),game);
 await assert.rejects(lab.friends.accept(invite.token,B),/Another player/);
 const newGuest=lab.guest();await assert.rejects(lab.service.get(game.matchId,newGuest));
});
test('lab cancellation and separate challenges do not overwrite another recipient',async()=>{
 const lab=createInviteLab(),first=await lab.friends.create(A,{name:'Bob'}),second=await lab.friends.create(A,{name:'Bob'});
 await lab.friends.accept(first.token,A,true);
 await assert.rejects(lab.friends.accept(first.token,B),/cancelled/);
 await lab.friends.accept(second.token,B);
 assert.equal((await lab.service.get(second.matchId,B)).viewerTeam,'away');
});
