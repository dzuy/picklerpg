import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/postgres';
import {A,B} from './helpers/remote';
import {newPlayer,playerId} from '../src/player-design';
test('roster mutations are atomic, idempotent, scoped to the actor and retain unrelated cloud players',async()=>{
 const db=await database();try{
  await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
  const c=await db.pool.connect();try{
   await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
   const player=newPlayer('a'),op={id:playerId(),expectedRevision:0,change:{kind:'save',playerId:player.id},player,activeId:player.id};
   const apply=(o:unknown)=>c.query('select public.apply_roster_change($1)',[o]);
   await apply(op);const second={...op,id:playerId(),expectedRevision:1,player:{...player,name:'New name'}};await apply(second);await apply(op);
   const staleId=playerId();
   await assert.rejects(apply({...op,id:staleId,expectedRevision:1,player:{...player,name:'Stale edit'}}),/changed elsewhere/);
   await assert.rejects(apply({...op,id:playerId(),expectedRevision:2,previousOperation:staleId,player:{...player,name:'Second stale edit'}}),/changed elsewhere/);
   await assert.rejects(apply({...op,id:playerId()}),/changed elsewhere/);
   await assert.rejects(c.query("update players set name='Old cached name' where id=$1",[player.id]),/changed elsewhere/);
   assert.equal((await c.query('select name from players where id=$1',[player.id])).rows[0].name,'New name');
   await assert.rejects(apply({...op,id:playerId(),player:{...player,handedness:'invalid'}}));
   assert.equal((await c.query('select is_active from players where id=$1',[player.id])).rows[0].is_active,true);
   const cloud=newPlayer('cloud-only');await apply({id:playerId(),expectedRevision:0,change:{kind:'save',playerId:cloud.id},player:cloud,activeId:player.id});
   await apply({id:playerId(),expectedRevision:2,change:{kind:'delete',playerId:player.id},activeId:cloud.id});
   await assert.rejects(apply({...second,id:playerId()}),/changed elsewhere/);
   assert.deepEqual((await c.query('select id,is_active from players')).rows,[{id:cloud.id,is_active:true}]);
   await c.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);
   await apply({id:playerId(),expectedRevision:0,change:{kind:'delete',playerId:cloud.id},activeId:null});
   await c.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);assert.equal((await c.query('select count(*) from players')).rows[0].count,1);
  }finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
