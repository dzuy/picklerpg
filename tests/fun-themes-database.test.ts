import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {pgInvitations} from './helpers/invitations';
import {A,B,creation,testers,action} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {InvitationService} from '../server/multiplayer/invitations';
import {applyFunTheme} from '../src/fun-themes';
import {premiumAppearance} from '../src/premium-appearance';

test('theme host must own Fun; free guests see the snapshot; turns retain theme; saved looks stay intact',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);await db.pool.query('update premium_configuration set enforcement_enabled=true');
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),invites=new InvitationService(pgInvitations(repo),service,testers);
  const team=[creation().roster.you,creation().roster.partner] as const;
  const input={requestId:randomUUID(),opponentId:B,team,court:'forest',courtTheme:'disco',playerTheme:'disco',scoring:'rally-doubles',target:3};
  await assert.rejects(invites.create(A,input),/Fun Pack/);
  await repo.query("select grant_pack($1,$1,'fun',true,'theme test')",[A]);
  const invite=await invites.create(A,input);assert.equal(invite.courtTheme,'disco');
  const match=await invites.accept(invite.id,B,{team});assert.equal(match.courtTheme,'disco');assert.equal(match.roster['opponent-left'].appearance.funTheme,'disco');assert.equal(match.roster.you.appearance.funTheme,undefined);
  const stored=await repo.get(match.id,B);assert.equal(stored!.checkpoint.courtTheme,'disco');
  const receipt=await service.act(match.id,B,action(match));assert.equal(receipt.state.courtTheme,'disco');assert.equal((await service.get(match.id,A)).courtTheme,'disco');
  const a=applyFunTheme(team[0].appearance,'fairy');assert.deepEqual((await repo.query('select pack_appearance($1,$2) as a',[a,B])).rows[0].a,premiumAppearance(a,[]));
  await repo.query("select grant_pack($1,$1,'fun',false,'revoke test')",[A]);assert.equal((await service.get(match.id,B)).courtTheme,'disco');
  await assert.rejects(invites.create(A,{...input,requestId:randomUUID()}),/Fun Pack/);
 }finally{await db.close()}
});
