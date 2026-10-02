import test from 'node:test';
import assert from 'node:assert/strict';
import {activeAuthenticatedUser} from '../server/multiplayer/account-archive';
test('server authentication consults live archive state and fails closed for stale JWTs or lookup errors',async()=>{
 const user={id:'user',app_metadata:{}};
 const db=(archived:boolean,error:unknown=null)=>({auth:{getUser:async()=>({data:{user},error:null})},rpc:async()=>({data:archived,error})}) as any;
 assert.equal(await activeAuthenticatedUser(db(true),'old-token'),null);
 assert.equal((await activeAuthenticatedUser(db(false),'valid-token'))?.id,'user');
 await assert.rejects(activeAuthenticatedUser(db(false,{}),'valid-token'),/status unavailable/);
 assert.equal(await activeAuthenticatedUser({auth:{getUser:async()=>({data:{user:{...user,app_metadata:{account_archived_at:'2026-10-01'}}},error:null})}} as any,'old-token'),null);
});
