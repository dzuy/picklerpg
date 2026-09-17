import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/postgres';
import {A,B} from './helpers/remote';
import {starterPlayer} from '../src/starter-player';

test('username registry rejects case-insensitive duplicates and preserves guest accounts',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  await db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'Bob'},A]);
  await assert.rejects(db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'BOB'},B]),/duplicate key/);
  assert.equal((await db.pool.query('select username from public.usernames where user_id=$1',[A])).rows[0].username,'bob');
  await db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'bobsmith'},B]);
  await assert.rejects(db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'bad name'},B]),/check constraint/);
  assert.equal((await db.pool.query('select username from public.usernames where user_id=$1',[B])).rows[0].username,'bobsmith');
 }finally{await db.close();}
});

test('signup creates one active player and later profile edits preserve customization',async()=>{
 const db=await database();try{
  const starter=starterPlayer('New Player','starter');
  await db.pool.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[A,{username:'newplayer',starter_player:starter}]);
  const first=(await db.pool.query('select * from public.players where owner_id=$1',[A])).rows[0];
  assert.equal(first.name,'New Player');assert.equal(first.is_active,true);assert.deepEqual(first.appearance,starter.appearance);
  await db.pool.query("update public.players set name='Customized' where owner_id=$1",[A]);
  await db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'newplayer',starter_player:starterPlayer('Replacement','starter')},A]);
  const rows=(await db.pool.query('select * from public.players where owner_id=$1',[A])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].name,'Customized');assert.deepEqual(rows[0].appearance,starter.appearance);
  await db.pool.query('insert into auth.users(id) values($1)',[B]);
  assert.equal((await db.pool.query('select * from public.players where owner_id=$1',[B])).rows.length,0);
  await db.pool.query('update auth.users set raw_user_meta_data=$1 where id=$2',[{username:'guestupgrade',starter_player:starter},B]);
  assert.equal((await db.pool.query('select * from public.players where owner_id=$1',[B])).rows.length,1);
 }finally{await db.close();}
});
