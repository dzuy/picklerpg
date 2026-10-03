import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {activeAuthenticatedUser} from './account-archive';
import {ADMIN_OWNER_ID} from './admin-owner';
import {memoryRateLimits} from './rate-limit';
import {INITIAL_ADMIN_TODOS} from './admin-todos-seed';
import {TODO_GROUPS,type AdminTodo,type AdminTodoList,type TodoAction} from '../../src/admin-todos-contract';
class TodoError extends Error {constructor(public status:number,message:string){super(message)}}
const unavailable=()=>new TodoError(503,'To-do storage is unavailable. Check the admin to-do migration and try again.');
export interface TodoRepository {load():Promise<AdminTodoList>;save(previous:number,items:AdminTodo[]):Promise<AdminTodoList>}
export function adminTodosRepository(db:SupabaseClient):TodoRepository {
 return {
  async load(){
   const result=await db.from('admin_todo_lists').select('version,items').eq('owner_id',ADMIN_OWNER_ID).maybeSingle();if(result.error)throw unavailable();if(result.data)return result.data;
   const seeded=await db.from('admin_todo_lists').upsert({owner_id:ADMIN_OWNER_ID,version:1,items:INITIAL_ADMIN_TODOS},{onConflict:'owner_id',ignoreDuplicates:true});if(seeded.error)throw unavailable();
   const read=await db.from('admin_todo_lists').select('version,items').eq('owner_id',ADMIN_OWNER_ID).single();if(read.error)throw unavailable();return read.data;
  },
  async save(previous,items){
   const result=await db.from('admin_todo_lists').update({version:previous+1,items}).eq('owner_id',ADMIN_OWNER_ID).eq('version',previous).select('version,items').maybeSingle();if(result.error)throw unavailable();if(!result.data)throw new TodoError(409,'This list changed in another tab. Refresh before saving again.');return result.data;
  }
 };
}
function validItem(value:unknown):value is AdminTodo {
 const v=value as AdminTodo;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','title','notes','group','done'].includes(k)))return false;
 return typeof v.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v.id)&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=160&&typeof v.notes==='string'&&v.notes.length<=4000&&typeof v.group==='string'&&Object.hasOwn(TODO_GROUPS,v.group)&&typeof v.done==='boolean';
}
export function applyTodoAction(state:AdminTodoList,input:unknown):AdminTodo[]{
 const v=input as TodoAction;if(!v||typeof v!=='object'||Array.isArray(v)||!Number.isSafeInteger(v.version)||v.version<1)throw new TodoError(400,'Invalid list revision.');
 if(v.version!==state.version)throw new TodoError(409,'This list changed in another tab. Refresh before saving again.');
 if(v.action==='delete'){
  if(Object.keys(v).some(k=>!['action','id','version'].includes(k))||typeof v.id!=='string'||!state.items.some(i=>i.id===v.id))throw new TodoError(400,'Choose an existing task.');
  return state.items.filter(i=>i.id!==v.id);
 }
 if(!['add','edit'].includes(v.action)||Object.keys(v).some(k=>!['action','item','version'].includes(k))||!validItem(v.item))throw new TodoError(400,'Use a title up to 160 characters, notes up to 4000 characters, and a valid group.');
 const item={...v.item,title:v.item.title.trim()},exists=state.items.some(i=>i.id===item.id);
 if(v.action==='add'){if(exists||state.items.length>=500)throw new TodoError(409,'This task already exists or the list is full. Refresh the list.');return [...state.items,item];}
 if(!exists)throw new TodoError(409,'This task was deleted. Refresh the list.');return state.items.map(i=>i.id===item.id?item:i);
}
export function createAdminTodosHandler(deps:{authenticate:(token:string)=>Promise<{id:string;is_anonymous?:boolean}|null>;repository:TodoRepository}){
 const limit=memoryRateLimits();
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const send=(status:number,data:unknown)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}).end(JSON.stringify(data));
  try{
   const token=req.headers.authorization?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];if(!token)throw new TodoError(401,'Sign in as dzuy to open your private list.');
   const user=await deps.authenticate(token);if(!user)throw new TodoError(401,'Sign in again.');if(user.id!==ADMIN_OWNER_ID||user.is_anonymous!==false)throw new TodoError(403,'Only the dzuy owner account can access this list.');
   if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host}catch{throw new TodoError(403,'Invalid origin.')}if(host!==req.headers.host)throw new TodoError(403,'Invalid origin.');}
   const url=new URL(req.url??'/','http://localhost');if(!/^\/api\/admin\/todos$/.test(url.pathname)||url.search)throw new TodoError(404,'To-do route not found.');
   const delay=await limit(user.id,120);if(delay){res.setHeader('Retry-After',String(delay));throw new TodoError(429,'Please wait a moment.');}
   if(req.method==='GET')return send(200,await deps.repository.load());
   if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw new TodoError(405,'Use GET or POST.');}
   if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new TodoError(415,'Send JSON.');
   let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>24000)throw new TodoError(413,'Request too large.');chunks.push(Buffer.from(chunk));}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new TodoError(400,'Invalid JSON.');}
   const state=await deps.repository.load(),items=applyTodoAction(state,input);return send(200,await deps.repository.save(state.version,items));
  }catch(error){const e=error instanceof TodoError?error:unavailable();send(e.status,{error:{message:e.message}});}
 };
}
export function configuredAdminTodosHandler(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 return createAdminTodosHandler({authenticate:async token=>{if(!db)throw unavailable();return activeAuthenticatedUser(db,token);},repository:db?adminTodosRepository(db):{load:async()=>{throw unavailable()},save:async()=>{throw unavailable()}}});
}
