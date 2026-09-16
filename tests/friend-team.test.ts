import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {A,B,testers,creation} from './helpers/remote';
import {MatchService} from '../server/multiplayer/service';
import {LOOKS} from '../src/player-looks';
import {FriendService} from '../server/multiplayer/friends';

test('chosen friend team survives creation, acceptance, and unrelated character saves',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
 const repo=new PgRepository(db.pool),matches=new MatchService(repo,testers);
 const client:any={rpc:async(_name:string,{p_invite,p_match}:any)=>({data:(await repo.query('select public.create_friend_challenge($1,$2) as value',[p_invite,p_match])).rows[0].value})};
 const friends=new FriendService(client,matches),roster=creation().roster;
 const team=[{...roster.you,name:'Selected captain'},{...roster.partner,name:'Selected partner'}];
 await db.pool.query("insert into public.players(owner_id,id,name,appearance,skills,handedness) values($1,'unrelated','Other character',$2,$3,'right')",[A,roster['opponent-left'].appearance,roster['opponent-left'].skills]);
 const request={name:'Max',requestId:randomUUID(),team};
 const repeated=await friends.create(A,{...request,requestId:randomUUID(),team:[team[0],team[0]]});const repeatedRow=(await repo.get(repeated.matchId,A))!;assert.deepEqual(repeatedRow.checkpoint.roster.you.design,repeatedRow.checkpoint.roster.partner.design);
 const invite=await friends.create(A,request);assert.deepEqual(await friends.create(A,request),invite);
 await assert.rejects(friends.create(A,{...request,team:[{...team[0],name:'Changed'},team[1]]}));
 const before=(await repo.get(invite.matchId,A))!;
 assert.deepEqual(before.checkpoint.roster.you.design,team[0]);assert.deepEqual(before.checkpoint.roster.partner.design,team[1]);
 const opening=await matches.friendOpening(invite.matchId,A);
 assert.ok(LOOKS.some(look=>look.name===opening!.roster['opponent-right'].design!.name));assert.notEqual(opening!.roster['opponent-right'].design!.name,'Partner');
 await repo.query('select public.claim_friend_challenge($1,$2,$3,false,true,$4)',[invite.token,B,'Max',opening]);
 await db.pool.query("update public.players set name='Unrelated edit' where owner_id=$1",[A]);
 let saved=(await repo.get(invite.matchId,A))!;
 assert.deepEqual(saved.checkpoint.roster.you.design,team[0]);assert.deepEqual(saved.checkpoint.roster.partner.design,team[1]);assert.equal(saved.current_action_user_id,B);
 await db.pool.query("insert into public.players(owner_id,id,name,appearance,skills,handedness) values($1,$2,'Partner edited',$3,$4,'right')",[A,team[1].id,team[1].appearance,team[1].skills]);
 saved=(await repo.get(invite.matchId,A))!;assert.equal(saved.checkpoint.roster.partner.design!.name,'Partner edited');assert.deepEqual(saved.checkpoint.roster.you.design,team[0]);
 const second=await friends.create(A,{...request,requestId:randomUUID()});
 const recipient=[{...roster['opponent-left'],name:'Chosen receiver'},{...roster['opponent-right'],name:'Chosen teammate'}] as [typeof roster.you,typeof roster.you];
 const chosen=await matches.friendOpening(second.matchId,A,recipient);
 await repo.query('select public.claim_friend_challenge($1,$2,$3,false,false,$4,true)',[second.token,B,'Account name',chosen]);
 await db.pool.query("insert into public.players(owner_id,id,name,appearance,skills,handedness) values($1,'unrelated-receiver','Other receiver',$2,$3,'right')",[B,team[0].appearance,team[0].skills]);
 const selected=(await repo.get(second.matchId,B))!;
 assert.deepEqual(selected.checkpoint.roster['opponent-left'].design,recipient[0]);assert.deepEqual(selected.checkpoint.roster['opponent-right'].design,recipient[1]);assert.equal(selected.current_action_user_id,B);
 await repo.query('select public.claim_friend_challenge($1,$2,$3,false,false,null,false)',[second.token,B,'Account name']);assert.deepEqual(await repo.get(second.matchId,B),selected);
 }finally{await db.close();}
});
