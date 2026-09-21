import test from 'node:test';
import assert from 'node:assert/strict';
import {database,PgRepository} from './helpers/postgres';
import {A,B,creation,testers} from './helpers/remote';
import {newPlayer,validatePlayer,savePlayer} from '../src/player-design';
import {MatchService} from '../server/multiplayer/service';
import {resolvePublicTeam} from '../server/multiplayer/public-players';

test('community copies preserve their starting build across source edits, unpublishing and deletion',async()=>{
 const db=await database();try{
 await db.pool.query('insert into auth.users(id) values($1),($2)',[A,B]);
 await db.pool.query("update auth.users set raw_user_meta_data=$2 where id=$1",[A,{player_name:'Alex'}]);
 async function as(owner:string,sql:string,args:unknown[]=[]){const c=await db.pool.connect();try{await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);const r=await c.query(sql,args);await c.query('commit');return r;}catch(e){await c.query('rollback');throw e}finally{c.release()}}
 const player={...newPlayer('public-test'),name:'Thor'};
 const inserted=await as(A,'insert into players(owner_id,id,name,appearance,skills,handedness) values($1,$2,$3,$4,$5,$6) returning public_id',[A,player.id,player.name,player.appearance,player.skills,player.handedness]);
 const id=inserted.rows[0].public_id;
 assert.equal((await as(B,'select * from community_player_catalog()')).rows.length,0);
 await assert.rejects(as(B,'insert into community_player_selections(owner_id,public_id) values($1,$2)',[B,id]));
 await as(A,'update players set is_public=true where id=$1',[player.id]);
 const published=(await as(B,'select * from community_player_catalog()')).rows[0];assert.equal(published.creator_name,'Alex');assert.equal(published.player.name,'Thor');assert.equal(published.player.id,`community-${id}`);assert.equal(published.owner_id,undefined);
 assert.equal((await as(B,'select * from players where owner_id=$1',[A])).rows.length,0);
 assert.equal((await as(B,"update players set name='Stolen' where owner_id=$1",[A])).rowCount,0);
 assert.equal((await as(B,'delete from players where owner_id=$1',[A])).rowCount,0);
 await as(B,'insert into community_player_selections(owner_id,public_id) values($1,$2)',[B,id]);assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].added,true);
 assert.equal((await as(A,'select * from community_player_catalog()')).rows[0].added,false);
 const service=new MatchService(new PgRepository(db.pool),testers),input=creation();input.roster.you=validatePlayer(published.player);const match=await service.create(A,input);
 await as(A,"update players set name='Thor Updated' where id=$1",[player.id]);assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].player.name,'Thor');assert.equal((await service.get(match.id,A)).roster.you.name,'Thor');
 await as(A,'update players set is_public=false where id=$1',[player.id]);assert.equal((await as(B,'select * from community_player_catalog()')).rows.length,1);
 await as(A,'delete from players where id=$1',[player.id]);assert.equal((await as(B,'select * from community_player_selections')).rows.length,1);assert.equal((await service.get(match.id,A)).roster.you.name,'Thor');
 }finally{await db.close()}
});

test('sharing defaults off and public references cannot be saved as owned edits',()=>{
 assert.notEqual(newPlayer().isPublic,true);assert.equal(validatePlayer({...newPlayer(),isPublic:true}).isPublic,true);assert.throws(()=>validatePlayer({...newPlayer(),isPublic:'yes'}));
 assert.throws(()=>savePlayer({setItem:()=>{}},{version:1,activeId:null,players:[]},newPlayer('community-123')),/creator/);
});

test('server resolves public designs and rejects unavailable community selections',async()=>{
 const old={...newPlayer('community-11111111-1111-4111-8111-111111111111'),name:'Old'},latest={...old,name:'Updated'};
 const fake={rpc:async()=>({data:[{player:latest}],error:null})} as any;
 assert.equal((await resolvePublicTeam(fake,[old,newPlayer('partner')]))[0].name,'Updated');
 await assert.rejects(resolvePublicTeam({rpc:async()=>({data:[],error:null})} as any,[old,newPlayer('partner')]),/no longer in your roster/);
});
