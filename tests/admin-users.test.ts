import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAdminUsersHandler,adminUsersRepository,type AdminUsersDependencies} from '../server/multiplayer/admin-users';
const owner='a1111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222',stamp='2026-10-01T00:00:00Z';
async function serve(overrides:Partial<AdminUsersDependencies>,run:(url:string)=>Promise<void>){
 const handler=createAdminUsersHandler({ownerId:owner,authenticate:async token=>token==='owner'?{id:owner}:token==='guest'?{id:owner,is_anonymous:true}:token==='impostor'?{id:target,user_metadata:{username:'dzuy'}} as any:null,list:async()=>({users:[],page:1,total:0,nextPage:null}),detail:async()=>({} as any),edit:async()=>{},remove:async()=>{},...overrides});
 const server=createServer(handler);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));try{await run(`http://127.0.0.1:${(server.address() as any).port}/api/admin/users`);}finally{await new Promise<void>(resolve=>server.close(resolve));}
}
const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
const edit={action:'edit',username:'player',playerName:'Player',email:'player@example.com',updatedAt:stamp};
test('all user admin routes require verified owner identity; editable dzuy name never grants access',async()=>{
 let calls=0;await serve({list:async()=>{calls++;throw Error('private-secret');},detail:async()=>{calls++;return {} as any;},edit:async()=>{calls++;},remove:async()=>{calls++;}},async url=>{
  for(const token of ['', 'invalid','guest','impostor'])for(const [path,method] of [['','GET'],['/'+target,'GET'],['/'+target,'POST']]){
   const r=await fetch(url+path,{method,headers:token?{...headers,Authorization:`Bearer ${token}`}:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(edit):undefined});assert.equal(r.status,token==='guest'||token==='impostor'?403:401);
  }assert.equal(calls,0);
  const response=await fetch(url,{headers});assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');assert.doesNotMatch(await response.text(),/private-secret/);
 });
});
test('owner protected, strict validation, bounded JSON, origin and archive validation checked before mutation',async()=>{
 let edits=0,removals=0;await serve({edit:async()=>{edits++;},remove:async()=>{removals++;}},async url=>{
  const post=(id:string,value:unknown,extra={})=>fetch(url+'/'+id,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(value)});
  assert.equal((await post(owner,edit)).status,403);
  assert.equal((await post(owner.toUpperCase(),edit)).status,403);
  for(const input of [{...edit,app_metadata:{admin:true}},{...edit,username:'Bad Name'},{...edit,email:'bad'},{...edit,playerName:'x'.repeat(25)},{...edit,updatedAt:'bad'},{...edit,action:'grant'}])assert.equal((await post(target,input)).status,400);
  assert.equal((await post(target,edit,{Origin:'https://evil.example'})).status,403);
  assert.equal((await post(target,edit,{'Content-Type':'text/plain'})).status,415);
  assert.equal((await post(target,{...edit,playerName:'x'.repeat(5000)})).status,413);
  assert.equal((await post(target,{action:'remove',confirmation:'player',updatedAt:stamp})).status,400);
  assert.equal(edits,0);assert.equal(removals,0);
  assert.equal((await post(target,edit)).status,200);assert.equal(edits,1);
  assert.equal((await post(target,{action:'remove',updatedAt:stamp})).status,200);assert.equal(removals,1);
  for(const query of ['?page=0','?page=1&page=2','?search=secret','?page=100000'])assert.equal((await fetch(url+query,{headers})).status,400);
  assert.equal((await fetch(url+'/'+target,{headers,method:'DELETE'})).status,405);
 });
});
function fakeRepository({auditError=false,archiveError=false,guest=false,changed=false}={}){
 const events:string[]=[];let attributes:any;
 const user={id:target,email:guest?undefined:'player@example.com',is_anonymous:guest,created_at:stamp,updated_at:changed?'2026-10-02T00:00:00Z':stamp,user_metadata:{username:'player',other:'preserve'},app_metadata:{community_admin:false}};
 const db={auth:{admin:{getUserById:async()=>({data:{user},error:null}),updateUserById:async(_id:string,attrs:unknown)=>{attributes=attrs;events.push('edit');return {error:null};},deleteUser:async()=>{assert.fail('Archiving must not delete the Auth user');}}},from:(name:string)=>{
  const chain:any={insert:()=>{events.push('audit');return chain;},update:(data:any)=>{events.push('audit-'+data.status);return chain;},select:()=>chain,eq:()=>Promise.resolve({data:[{path:'owned-card.png'}],error:null}),single:async()=>({data:{id:1},error:auditError?{}:null})};return chain;
 },rpc:async(name:string)=>{assert.equal(name,'archive_admin_account');events.push('archive');return {data:stamp,error:archiveError?{code:'40001'}:null};},storage:{from:()=>({remove:async()=>{assert.fail('Archiving must not delete hosted cards');}})}};
 return {repo:adminUsersRepository(db as any,owner),events,attrs:()=>attributes};
}
test('removal audits and archives without deleting accounts or hosted cards; failures leave audit evidence',async()=>{
 const good=fakeRepository();await good.repo.remove(target,stamp);assert.deepEqual(good.events,['audit','archive','audit-completed']);
 const noAudit=fakeRepository({auditError:true});await assert.rejects(noAudit.repo.remove(target,stamp));assert.deepEqual(noAudit.events,['audit']);
 const failure=fakeRepository({archiveError:true});await assert.rejects(failure.repo.remove(target,stamp));assert.deepEqual(failure.events,['audit','archive','audit-failed']);
 const stale=fakeRepository({changed:true});await assert.rejects(stale.repo.remove(target,stamp));assert.deepEqual(stale.events,[]);
 await assert.rejects(good.repo.remove(owner,stamp),/owner/i);
});
test('edits preserve unrelated metadata and never grant privileges or confirm email; guest conversion disallowed',async()=>{
 const good=fakeRepository();await good.repo.edit(target,{username:'new_player',playerName:'New Player',email:'new@example.com',updatedAt:stamp});assert.equal(good.attrs().user_metadata.other,'preserve');assert.equal(good.attrs().email,'new@example.com');assert.equal(good.attrs().app_metadata,undefined);assert.equal(good.attrs().email_confirm,undefined);assert.deepEqual(good.events,['audit','edit','audit-completed']);
 const guest=fakeRepository({guest:true});await assert.rejects(guest.repo.edit(target,{...edit,email:'new@example.com'}));assert.deepEqual(guest.events,[]);
});

test('active and archived views filter before pagination and retain archive status',async()=>{
 const users=Array.from({length:102},(_,i)=>({id:`account-${i}`,created_at:stamp,user_metadata:{},app_metadata:i%2?{account_archived_at:stamp}:{}}));
 const db:any={auth:{admin:{listUsers:async({page}:any)=>({data:{users:page===1?users.slice(0,60):users.slice(60),nextPage:page===1?2:null},error:null})}},from:()=>({select:()=>({in:()=>({is:async()=>({data:[],error:null})})})})};
 const repo=adminUsersRepository(db,owner);
 const active=await repo.list(1),archived=await repo.list(2,'archived'),all=await repo.list(3,'all');
 assert.equal(active.total,51);assert.equal(active.users.length,50);assert.equal(active.nextPage,2);assert.ok(active.users.every(u=>u.archivedAt===null));
 assert.equal(archived.total,51);assert.equal(archived.users.length,1);assert.equal(archived.nextPage,null);assert.equal(archived.users[0].id,'account-101');assert.equal(archived.users[0].archivedAt,stamp);
 assert.equal(all.total,102);assert.equal(all.users.length,2);assert.equal(all.nextPage,null);
});
