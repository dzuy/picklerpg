import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {adminTodosRepository,applyTodoAction,createAdminTodosHandler,type TodoRepository} from '../server/multiplayer/admin-todos';
import {ADMIN_OWNER_ID} from '../server/multiplayer/admin-owner';
import {INITIAL_ADMIN_TODOS} from '../server/multiplayer/admin-todos-seed';
import type {AdminTodo,AdminTodoList} from '../src/admin-todos-contract';
import {database} from './helpers/postgres';
const item:AdminTodo={id:'test-task',title:'Example task',notes:'Private notes',group:'next',done:false};
const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
async function serve(repository:TodoRepository,run:(url:string)=>Promise<void>){
 const handler=createAdminTodosHandler({repository,authenticate:async token=>token==='owner'?{id:ADMIN_OWNER_ID,is_anonymous:false}:token==='guest'?{id:ADMIN_OWNER_ID,is_anonymous:true}:token==='impostor'?{id:'someone-else',is_anonymous:false,user_metadata:{username:'dzuy'}}:null});
 const server=createServer(handler);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));try{await run(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/admin/todos`);}finally{await new Promise<void>(r=>server.close(()=>r()));}
}
test('private todos deny unauthenticated, guest, non-owner and cross-origin access before storage',async()=>{
 let calls=0;await serve({load:async()=>{calls++;throw Error('private data');},save:async()=>{calls++;throw Error('private data');}},async url=>{
  for(const method of ['GET','POST'])for(const token of ['', 'invalid','guest','impostor']){const r=await fetch(url,{method,headers:token?{...headers,Authorization:`Bearer ${token}`}:{},body:method==='POST'?'{}':undefined});assert.equal(r.status,['guest','impostor'].includes(token)?403:401);assert.equal(r.headers.get('cache-control'),'no-store');assert.doesNotMatch(await r.text(),/Private notes/);}
  assert.equal((await fetch(url,{headers:{...headers,Origin:'https://evil.example'}})).status,403);assert.equal(calls,0);
  const r=await fetch(url,{headers});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private data/);
 });
});
test('owner can add, edit, complete, reopen and delete; stale revisions and malformed changes fail',async()=>{
 let state:AdminTodoList={version:1,items:[]};await serve({load:async()=>structuredClone(state),save:async(version,items)=>{assert.equal(version,state.version);state={version:version+1,items};return state;}},async url=>{
  const post=(input:unknown,extra={})=>fetch(url,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(input)});
  assert.equal((await fetch(url,{headers})).status,200);
  for(const [action,value] of [['add',item],['edit',{...item,title:'Changed',group:'later'}],['edit',{...item,done:true}],['edit',{...item,done:false}]] as const){const r=await post({action,item:value,version:state.version});assert.equal(r.status,200);assert.deepEqual((await r.json()).items,[value]);}
  assert.equal((await post({action:'delete',id:item.id,version:1})).status,409);assert.equal(state.items.length,1);
  for(const input of [{action:'edit',item:{...item,title:''}},{action:'add',item:{...item,notes:'x'.repeat(4001)}},{action:'add',item:{...item,group:'invalid'}},{action:'add',item:{...item,owner_id:'other'}},{action:'wipe'}])assert.equal((await post({...input,version:state.version})).status,400);
  assert.equal((await post({}, {'Content-Type':'text/plain'})).status,415);assert.equal((await post({notes:'x'.repeat(24001)})).status,413);
  assert.equal((await fetch(url+'?owner=other',{headers})).status,404);assert.equal((await fetch(url,{method:'DELETE',headers})).status,405);
  assert.equal((await post({action:'delete',id:item.id,version:state.version})).status,200);assert.deepEqual(state.items,[]);
 });
});
test('seed has unique valid tasks and records completed roster work separately from acceptance',()=>{
 assert.equal(new Set(INITIAL_ADMIN_TODOS.map(i=>i.id)).size,INITIAL_ADMIN_TODOS.length);
 let state:AdminTodoList={version:1,items:[]};for(const item of INITIAL_ADMIN_TODOS)state={version:1,items:applyTodoAction(state,{action:'add',version:1,item})};
 assert.ok(state.items.some(i=>i.id==='build20-roster'&&i.done));assert.ok(state.items.some(i=>i.group==='acceptance'&&!i.done));
});
test('real database: service-only access, concurrent one-time seed, atomic revisions and durable empty list',async()=>{
 const db=await database();
 // Minimal PostgREST transport adapter: production repository calls run against real SQL.
 const client={from:(table:string)=>{
  assert.equal(table,'admin_todo_lists');let values:any=null,kind='read';const filters:Record<string,unknown>={};
  const execute=async()=>{const c=await db.pool.connect();try{await c.query('set role service_role');let result;
   if(kind==='seed')result=await c.query('insert into public.admin_todo_lists(owner_id,version,items) values($1,$2,$3) on conflict(owner_id) do nothing',[values.owner_id,values.version,JSON.stringify(values.items)]);
   else if(kind==='save')result=await c.query('update public.admin_todo_lists set version=$1,items=$2 where owner_id=$3 and version=$4 returning version,items',[values.version,JSON.stringify(values.items),filters.owner_id,filters.version]);
   else result=await c.query('select version,items from public.admin_todo_lists where owner_id=$1',[filters.owner_id]);
   return {data:result.rows[0]??null,error:null};
  }catch(error){return {data:null,error};}finally{await c.query('reset role');c.release();}};
  const chain:any={select:()=>chain,eq:(k:string,v:unknown)=>{filters[k]=v;return chain;},upsert:(v:unknown,opts:unknown)=>{assert.deepEqual(opts,{onConflict:'owner_id',ignoreDuplicates:true});values=v;kind='seed';return execute();},update:(v:unknown)=>{values=v;kind='save';return chain;},maybeSingle:execute,single:execute};return chain;
 }};
 try{
  const repo=adminTodosRepository(client as any);const [a,b]=await Promise.all([repo.load(),repo.load()]);assert.deepEqual(a,b);assert.equal(a.items.length,INITIAL_ADMIN_TODOS.length);
  for(const role of ['anon','authenticated']){const c=await db.pool.connect();try{await c.query(`set role ${role}`);for(const sql of ['select * from public.admin_todo_lists',"insert into public.admin_todo_lists(owner_id,items) values('"+ADMIN_OWNER_ID+"','[]')","update public.admin_todo_lists set items='[]'",'delete from public.admin_todo_lists'])await assert.rejects(c.query(sql),/permission denied/);}finally{await c.query('reset role');c.release();}}
  const writes=await Promise.allSettled([repo.save(a.version,[item]),repo.save(a.version,[])]);assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);assert.equal(writes.filter(r=>r.status==='rejected').length,1);
  let saved=await repo.load();saved=await repo.save(saved.version,[{...item,title:'Owner edit'}]);await db.restart();assert.deepEqual(await adminTodosRepository(client as any).load(),saved);
  saved=await repo.save(saved.version,[]);await db.restart();assert.deepEqual(await adminTodosRepository(client as any).load(),saved);
  await assert.rejects(db.pool.query("insert into public.admin_todo_lists(owner_id,items) values('11111111-1111-4111-8111-111111111111','[]')"),/check constraint/);
 }finally{await db.close();}
});
