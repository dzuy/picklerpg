import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/postgres';
import {A,B,C} from './helpers/remote';
import {newPlayer} from '../src/player-design';

test('only trusted admins can hide discovery; existing rosters, owner data and references survive',async()=>{
 const db=await database();try{
 assert.equal((await db.pool.query("select has_function_privilege('anon','public.remove_player_from_community(uuid)','EXECUTE') as allowed")).rows[0].allowed,false);
 await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
 await db.pool.query('update auth.users set raw_app_meta_data=$2 where id=$1',[A,{community_admin:true}]);
 await db.pool.query('update auth.users set raw_user_meta_data=$2 where id=$1',[C,{community_admin:true,username:'dzuy'}]);
 async function as(actor:string,sql:string,args:unknown[]=[]){const c=await db.pool.connect();try{await c.query('begin');await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);const r=await c.query(sql,args);await c.query('commit');return r;}catch(e){await c.query('rollback');throw e;}finally{c.release();}}
 const p=newPlayer('moderation-test');
 const {rows:[row]}=await as(C,'insert into players(owner_id,id,name,appearance,skills,handedness,is_public) values($1,$2,$3,$4,$5,$6,true) returning public_id',[C,p.id,p.name,p.appearance,p.skills,p.handedness]);const id=row.public_id;
 assert.equal((await as(C,'select is_community_admin() as admin')).rows[0].admin,false);
 await as(B,'insert into community_player_selections values($1,$2)',[B,id]);
 await assert.rejects(as(C,'select remove_player_from_community($1)',[id]),/Admin access/);
 await assert.rejects(as(C,'insert into community_player_moderation(public_id,hidden_by) values($1,$2)',[id,C]),/permission denied/);
 await as(A,'select remove_player_from_community($1)',[id]);
 await as(A,'select remove_player_from_community($1)',[id]);
 assert.equal((await as(C,'select * from community_player_catalog()')).rows.length,0);
 assert.equal((await as(B,'select * from community_player_catalog()')).rows[0].added,true);
 assert.equal((await as(B,'select * from community_player_catalog(array[$1]::uuid[])',[id])).rows.length,1);
 assert.equal((await db.pool.query('select * from community_roster_for_owner($1,array[$2]::uuid[])',[B,id])).rows.length,1);
 await assert.rejects(as(C,'insert into community_player_selections values($1,$2)',[C,id]),/row-level security|no longer available/);
 await as(C,"update players set is_public=true,name='Still owned' where public_id=$1",[id]);
 assert.equal((await as(C,'select * from community_player_catalog()')).rows.length,0);
 assert.equal((await as(C,'select name from players where public_id=$1',[id])).rows[0].name,'Still owned');
 await as(B,'delete from community_player_selections where public_id=$1',[id]);
 await assert.rejects(as(B,'insert into community_player_selections values($1,$2)',[B,id]),/row-level security|no longer available/);
 await db.pool.query("update auth.users set raw_app_meta_data='{}' where id=$1",[A]);
 await assert.rejects(as(A,'select remove_player_from_community($1)',[id]),/Admin access/);
 }finally{await db.close();}
});
