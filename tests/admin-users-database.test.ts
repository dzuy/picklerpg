import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/postgres';

test('admin audit is service-only and retained after target deletion',async()=>{
 const db=await database();try{
  const actor='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';
  await db.pool.query('insert into auth.users(id) values($1),($2)',[actor,target]);
  const client=await db.pool.connect();try{
   for(const role of ['anon','authenticated']){await client.query(`set role ${role}`);await assert.rejects(client.query('select * from admin_user_actions'),/permission/);await assert.rejects(client.query("insert into admin_user_actions(actor_id,target_id,action) values($1,$2,'remove')",[actor,target]),/permission/);await client.query('reset role');}
   await client.query('set role service_role');
   const row=await client.query("insert into admin_user_actions(actor_id,target_id,action) values($1,$2,'remove') returning id,status",[actor,target]);assert.equal(row.rows[0].status,'pending');
   await client.query("update admin_user_actions set status='completed',completed_at=now() where id=$1",[row.rows[0].id]);
   await assert.rejects(client.query('delete from admin_user_actions'),/permission/);
   await client.query('reset role');await client.query('delete from auth.users where id=$1',[target]);
   const audit=await client.query('select * from admin_user_actions');assert.equal(audit.rows.length,1);assert.equal(audit.rows[0].target_id,target);assert.equal(audit.rows[0].external_cleanup_completed_at,null);
  }finally{await client.query('reset role');client.release();}
 }finally{await db.close();}
});
