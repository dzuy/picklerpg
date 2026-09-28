import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,PgRepository} from './helpers/postgres';

test('analysis storage serializes claims, survives restart, isolates viewers and rejects client writes',async()=>{
 const db=await database();
 try{
  const owner=randomUUID(),other=randomUUID(),game=randomUUID(),token=randomUUID(),later=randomUUID();
  await db.pool.query('insert into auth.users(id) values($1),($2)',[owner,other]);
  let repo=new PgRepository(db.pool);
  const claim=(who:string,lease:string)=>repo.query("select public.claim_game_analysis($1,'friends',$2,$3) as claimed",[who,game,lease]);
  const results=await Promise.all([claim(owner,token),claim(owner,later)]);
  assert.equal(results.filter(r=>r.rows[0].claimed).length,1);
  assert.equal((await claim(other,randomUUID())).rows[0].claimed,true);
  // Recover an interrupted generation, but never replace a finished report.
  await db.pool.query("update game_analyses set lease_until=now()-interval '1 second' where owner_id=$1",[owner]);
  const finalToken=randomUUID();assert.equal((await claim(owner,finalToken)).rows[0].claimed,true);
  const analysis={report:{headline:'Saved report'},coverage:{complete:true,rallies:1,shots:2,fireballs:0}};
  assert.equal((await repo.query("update game_analyses set analysis=$1,model='test',generated_at=now(),claim_token=null,lease_until=null where owner_id=$2 and claim_token=$3",[analysis,owner,token])).rowCount,0);
  await repo.query("update game_analyses set analysis=$1,model='test',generated_at=now(),claim_token=null,lease_until=null where owner_id=$2 and claim_token=$3",[analysis,owner,finalToken]);
  await db.restart();repo=new PgRepository(db.pool);
  assert.deepEqual((await repo.query('select analysis from game_analyses where owner_id=$1',[owner])).rows[0].analysis,analysis);
  assert.equal((await claim(owner,randomUUID())).rows[0].claimed,false);
  const c=await db.pool.connect();
  try{
   await c.query('set role authenticated');
   await assert.rejects(c.query('select * from game_analyses'),/permission denied/);
   await assert.rejects(c.query("select claim_game_analysis($1,'solo',$2,$3)",[owner,game,token]),/permission denied/);
   await assert.rejects(c.query('delete from game_analyses'),/permission denied/);
  }finally{await c.query('reset role');c.release();}
 }finally{await db.close();}
});
