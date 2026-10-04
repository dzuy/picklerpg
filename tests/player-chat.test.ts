import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';
import {MatchService} from '../server/multiplayer/service';
import {A,B,C,testers,creation} from './helpers/remote';
import {chatPreview,cleanTrashTalk} from '../src/multiplayer/trash-talk';

test('chat previews truncate Unicode without censoring banter',()=>{
 assert.equal(cleanTrashTalk('  That fucking shot!  '),'That fucking shot!');
 assert.equal([...chatPreview('🔥'.repeat(61))].length,60);
 assert.equal(chatPreview('Nice shot!'),'Nice shot!');
});
test('persistent private chat: account pairs, permissions, pagination, mute, blocking, reports, retention and retries',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,new Map([...testers,[C,'Sam']]));
  const first=await service.create(A,creation()),rematch=await service.create(A,creation());
  const reverse=await service.create(B,{...creation(),opponentId:A});
  const third=await service.create(A,{...creation(),opponentId:C});
  const rpc=async(name:string,args:unknown[])=>(await new PgRepository(db.pool).query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;
  const feed=(match=first.id,actor=A)=>rpc('get_player_chat',[match,actor]);
  const send=(match=first.id,actor=A,id=randomUUID(),text='What a fucking shot!')=>rpc('send_player_chat',[match,actor,id,text]);
  await assert.rejects(feed(first.id,C),/Match not found/);await assert.rejects(rpc('get_player_chat',[first.id,null]),/Match not found/);
  const before=await repo.get(first.id,A),id=randomUUID();const sent=await send(first.id,A,id);
  assert.equal(sent.messages[0].text,'What a fucking shot!');assert.equal(sent.messages[0].senderId,A);
  assert.equal((await send(rematch.id,A,id)).messages.length,1,'retry across a rematch remains idempotent');
  await assert.rejects(send(first.id,A,id,'Changed'),/Message conflict/);
  await assert.rejects(send(rematch.id,A),/Chat cooldown/);
  const both=await Promise.allSettled([send(first.id,B),send(rematch.id,B)]);assert.equal(both.filter(r=>r.status==='fulfilled').length,1,'pair lock serializes sends across matches');
  const otherView=await feed(reverse.id,B);assert.equal(otherView.conversationId,sent.conversationId);assert.equal(otherView.messages.find((m:any)=>m.senderId===A).player,'opponent-left');
  assert.equal(otherView.replayMessages.length,0,'another match never supplies replay messages');
  assert.equal((await feed(third.id)).messages.length,0,'another opponent cannot see the pair history');
  const after=await repo.get(first.id,A);assert.equal(before!.version,after!.version);assert.deepEqual(before!.checkpoint,after!.checkpoint);assert.equal(String(before!.updated_at),String(after!.updated_at));
  await rpc('set_player_chat_muted',[first.id,A,true]);assert.equal((await feed(rematch.id)).muted,true);assert.equal((await feed(first.id,B)).muted,false);
  const evidence=await rpc('player_chat_report_evidence',[rematch.id,B,id]);assert.equal(evidence.messages[0].text,'What a fucking shot!');
  await assert.rejects(rpc('player_chat_report_evidence',[first.id,A,id]),/Message unavailable/);
  await assert.rejects(rpc('player_chat_report_evidence',[third.id,A,id]),/Message unavailable/);
  await db.pool.query('insert into public.player_blocks(owner_id,blocked_id) values($1,$2)',[A,B]);
  assert.equal((await feed()).blockedByYou,true);assert.equal((await feed(first.id,B)).blockedByYou,false);assert.deepEqual((await feed()).messages,[]);
  await assert.rejects(send(first.id,A,id),/Contact unavailable/);await assert.rejects(send(first.id,B),/Contact unavailable/);
  assert.equal((await rpc('player_chat_report_evidence',[first.id,B,id])).messages.length,1,'blocked players can still report evidence');
  await db.pool.query('delete from public.player_blocks');
  await db.pool.query('insert into public.account_archives(account_id,archived_by) values($1,$2)',[B,A]);
  await assert.rejects(send(),/Contact unavailable/);assert.equal((await feed()).blocked,true);
  await db.pool.query('delete from public.account_archives where account_id=$1',[B]);
  await db.pool.query("insert into public.player_messages(conversation_id,id,sender_id,match_id,version,text,created_at) select $1,gen_random_uuid(),$2,$3,0,'History '||n,now()-interval '1 day' from generate_series(1,105) n",[sent.conversationId,A,first.id]);
  const page=await feed();assert.equal(page.messages.length,50);assert.ok(page.nextCursor);const page2=await rpc('get_player_chat',[first.id,A,page.nextCursor.time,page.nextCursor.id]);const page3=await rpc('get_player_chat',[first.id,A,page2.nextCursor.time,page2.nextCursor.id]);
  assert.equal(new Set([...page.messages,...page2.messages,...page3.messages].map(m=>m.id)).size,107);assert.equal(page3.nextCursor,null);
  const connection=await db.pool.connect();try{for(const role of ['anon','authenticated','service_role']){await connection.query(`set role ${role}`);await assert.rejects(connection.query('select * from public.player_messages'),/permission denied/);if(role!=='service_role')await assert.rejects(connection.query('select public.get_player_chat($1,$2)',[first.id,A]),/permission denied/);await connection.query('reset role');}}finally{await connection.query('reset role');connection.release();}
  await db.pool.query('delete from public.async_matches where id=$1',[first.id]);assert.equal((await feed(rematch.id)).messages.length,50,'history survives source match deletion');
  await db.restart();assert.equal((await feed(rematch.id)).conversationId,sent.conversationId);
  await db.pool.query('delete from auth.users where id=$1',[A]);assert.equal((await db.pool.query('select count(*) from public.player_messages')).rows[0].count,0,'account deletion removes private history');
 }finally{await db.close();}
});

test('migration preserves legacy history and refuses pending matches with no second account',async()=>{
 const db=await database(undefined,'20261003119999');try{
  await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
  const repo=new PgRepository(db.pool),service=new MatchService(repo,testers),match=await service.create(A,creation());
  const id=randomUUID();await repo.query('select public.send_match_trash_talk($1,$2,$3,$4)',[match.id,A,id,'Legacy reaction']);
  const {readFile}=await import('node:fs/promises');await db.pool.query(await readFile(new URL('../supabase/migrations/20261003120000_player_chat.sql',import.meta.url),'utf8'));
  const feed=(await repo.query('select public.get_player_chat($1,$2) as value',[match.id,B])).rows[0].value;
  assert.equal(feed.messages.length,1);assert.equal(feed.messages[0].id,id);assert.equal(feed.messages[0].text,'Legacy reaction');
  await db.pool.query('update public.async_matches set away_user_id=null where id=$1',[match.id]);
  for(const actor of [A,C,null])await assert.rejects(repo.query('select public.get_player_chat($1,$2)',[match.id,actor]),/Match not found/);
 }finally{await db.close();}
});
