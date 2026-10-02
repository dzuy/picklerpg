import {activeAuthenticatedUser} from './account-archive';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient,type SupabaseClient,type User,type AdminUserAttributes} from '@supabase/supabase-js';
import {ADMIN_OWNER_ID} from './admin-owner';
import {memoryRateLimits} from './rate-limit';
import type {AdminAccount,AdminUserPage,AdminUserDetail} from '../../src/admin-users-contract';

class AdminError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
const unavailable=()=>new AdminError(503,'unavailable','Account administration is unavailable. Try again shortly.');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface AdminUsersDependencies {
 ownerId:string;authenticate:(token:string)=>Promise<{id:string;is_anonymous?:boolean}|null>;
 list:(page:number,scope?:'active'|'archived'|'all')=>Promise<AdminUserPage>;detail:(id:string)=>Promise<AdminUserDetail>;
 edit:(id:string,input:{username:string;playerName:string;email:string;updatedAt:string})=>Promise<void>;
 remove:(id:string,updatedAt:string)=>Promise<void>;
}
async function readBody(req:IncomingMessage){
 if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new AdminError(415,'content_type','Send JSON.');
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>4096)throw new AdminError(413,'too_large','Request is too large.');chunks.push(Buffer.from(chunk));}
 try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!result||typeof result!=='object'||Array.isArray(result))throw Error();return result as Record<string,unknown>;}catch{throw new AdminError(400,'invalid_json','Invalid request.');}
}
export function createAdminUsersHandler(deps:AdminUsersDependencies){
 const limit=memoryRateLimits();
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const send=(status:number,value:unknown)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}).end(JSON.stringify(value));
  try{
   const token=req.headers.authorization?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
   if(!token)throw new AdminError(401,'authentication','Sign in to continue.');
   const actor=await deps.authenticate(token);
   if(!actor)throw new AdminError(401,'authentication','Sign in again to continue.');
   if(!uuid.test(deps.ownerId)||actor.is_anonymous||actor.id!==deps.ownerId)throw new AdminError(403,'forbidden','Only the dzuy owner account can access this page.');
   if(req.headers.origin){let host;try{host=new URL(req.headers.origin).host;}catch{throw new AdminError(403,'origin','Invalid origin.');}if(host!==req.headers.host)throw new AdminError(403,'origin','Invalid origin.');}
   const delay=await limit(actor.id,60);if(delay){res.setHeader('Retry-After',String(delay));throw new AdminError(429,'rate_limited','Please wait a moment before trying again.');}
   const url=new URL(req.url??'/', 'http://localhost'),path=url.pathname;
   if(!['GET','POST'].includes(req.method??'')){res.setHeader('Allow','GET, POST');throw new AdminError(405,'method','Use GET or POST.');}
   if(path==='/api/admin/users'&&req.method==='GET'){
    if([...url.searchParams.keys()].some(k=>!['page','scope'].includes(k))||url.searchParams.getAll('page').length>1||url.searchParams.getAll('scope').length>1||!['active','archived','all'].includes(url.searchParams.get('scope')??'active')||! /^[1-9]\d{0,4}$/.test(url.searchParams.get('page')??'1'))throw new AdminError(400,'page','Invalid page.');
    return send(200,await deps.list(Number(url.searchParams.get('page')??1),(url.searchParams.get('scope')??'active') as 'active'|'archived'|'all'));
   }
   const match=/^\/api\/admin\/users\/([^/]+)$/.exec(path);
   if(!match||!uuid.test(match[1])||url.search)throw new AdminError(404,'not_found','Account route not found.');
   const id=match[1].toLowerCase();
   if(req.method==='GET')return send(200,await deps.detail(id));
   if(id===deps.ownerId)throw new AdminError(403,'owner_protected','The owner account cannot be edited or removed here.');
   const input=await readBody(req);
   if(typeof input.updatedAt!=='string'||!Number.isFinite(Date.parse(input.updatedAt)))throw new AdminError(400,'validation','Refresh this account before changing it.');
   if(input.action==='edit'){
    if(Object.keys(input).some(k=>!['action','username','playerName','email','updatedAt'].includes(k))||typeof input.username!=='string'||(input.username!==''&&!/^[a-z0-9_]{3,24}$/.test(input.username))||typeof input.playerName!=='string'||input.playerName.length>24||/[\x00-\x1f\x7f]/.test(input.playerName)||typeof input.email!=='string'||input.email.length>254||(input.email!==''&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)))throw new AdminError(400,'validation','Use a valid email, a 3–24 character username, and a name of up to 24 characters.');
    await deps.edit(id,{username:input.username,playerName:input.playerName.trim(),email:input.email.trim(),updatedAt:input.updatedAt});
    return send(200,{ok:true});
   }
   if(input.action==='remove'){
    if(Object.keys(input).some(k=>!['action','updatedAt'].includes(k)))throw new AdminError(400,'validation','Invalid archive request.');
    await deps.remove(id,input.updatedAt);
    return send(200,{ok:true,message:'Account archived. Sign-in and game access are disabled; saved data is retained.'});
   }
   throw new AdminError(400,'action','Choose edit or remove.');
  }catch(error){const e=error instanceof AdminError?error:unavailable();send(e.status,{error:{code:e.code,message:e.message}});}
 };
}
function account(user:User,deletionRequestedAt:string|null,ownerId:string):AdminAccount {
 return {id:user.id,username:typeof user.user_metadata?.username==='string'?user.user_metadata.username:'',playerName:typeof user.user_metadata?.player_name==='string'?user.user_metadata.player_name:'',email:user.email??'',createdAt:user.created_at,updatedAt:user.updated_at??user.created_at,lastSignInAt:user.last_sign_in_at??null,guest:!!user.is_anonymous,emailConfirmed:!!user.email_confirmed_at,bot:user.app_metadata?.community_bot===true,bannedUntil:user.banned_until??null,deletionRequestedAt,archivedAt:typeof user.app_metadata?.account_archived_at==='string'?user.app_metadata.account_archived_at:null,owner:user.id===ownerId};
}
export function adminUsersRepository(db:SupabaseClient,ownerId:string){
 async function get(id:string){const {data,error}=await db.auth.admin.getUserById(id);if(error||!data.user)throw new AdminError(404,'not_found','This account is no longer available.');return data.user;}
 async function deletionDates(ids:string[]){if(!ids.length)return new Map<string,string>();const {data,error}=await db.from('account_deletion_requests').select('account_id,requested_at').in('account_id',ids).is('completed_at',null);if(error)throw unavailable();return new Map((data??[]).map(r=>[r.account_id,r.requested_at]));}
 async function fresh(id:string,updatedAt:string){const user=await get(id);if((user.updated_at??user.created_at)!==updatedAt)throw new AdminError(409,'changed','This account changed. Close and reopen it before trying again.');return user;}
 // Write a durable private intent before any mutation. Missing audit schema fails closed.
 async function audited(id:string,action:'edit'|'archive',fields:string[],run:()=>Promise<void>){
  const {data,error}=await db.from('admin_user_actions').insert({actor_id:ownerId,target_id:id,action,changed_fields:fields}).select('id').single();if(error||!data)throw new AdminError(503,'setup','Install the admin audit migration before changing accounts.');
  try{await run();}catch(error){await db.from('admin_user_actions').update({status:'failed'}).eq('id',data.id);throw error;}
  const {error:finished}=await db.from('admin_user_actions').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',data.id);
  if(finished)throw new AdminError(503,'audit_pending','The account change succeeded, but its audit needs review. Refresh before doing anything else.');
 }
 return {
  async list(page:number,scope:'active'|'archived'|'all'='active'):Promise<AdminUserPage>{
   const users:User[]=[];
   for(let authPage=1;authPage<=100;authPage++){
    const {data,error}=await db.auth.admin.listUsers({page:authPage,perPage:1000});if(error)throw unavailable();
    users.push(...data.users);
    if(!data.nextPage)break;
    if(authPage===100)throw new AdminError(503,'size','Account list is too large to load safely.');
   }
   const filtered=users.filter(user=>scope==='all'||(scope==='archived'?!!user.app_metadata?.account_archived_at:!user.app_metadata?.account_archived_at));
   const rows=filtered.slice((page-1)*50,page*50),dates=await deletionDates(rows.map(u=>u.id));
   return {users:rows.map(u=>account(u,dates.get(u.id)??null,ownerId)),page,total:filtered.length,nextPage:page*50<filtered.length?page+1:null};
  },
  async detail(id:string):Promise<AdminUserDetail>{
   const user=await get(id),dates=await deletionDates([id]);
   const [players,active,completed]=await Promise.all([
    db.from('players').select('id',{count:'exact',head:true}).eq('owner_id',id),
    db.from('async_matches').select('id',{count:'exact',head:true}).or(`home_user_id.eq.${id},away_user_id.eq.${id}`).eq('status','active'),
    db.from('async_matches').select('id',{count:'exact',head:true}).or(`home_user_id.eq.${id},away_user_id.eq.${id}`).eq('status','completed')]);
   if(players.error||active.error||completed.error)throw unavailable();
   return {user:account(user,dates.get(id)??null,ownerId),players:players.count??0,activeGames:active.count??0,completedGames:completed.count??0};
  },
  async edit(id:string,input:{username:string;playerName:string;email:string;updatedAt:string}){
   const user=await fresh(id,input.updatedAt);
   if(user.app_metadata?.account_archived_at)throw new AdminError(409,'archived','Archived accounts are read-only.');
   if(user.is_anonymous&&input.email!==(user.email??''))throw new AdminError(400,'guest','Guest email cannot be changed here.');
   if(!user.is_anonymous&&!input.email)throw new AdminError(400,'email','Registered accounts must keep an email address.');
   if(user.user_metadata?.username&&!input.username)throw new AdminError(400,'username','An existing username cannot be cleared.');
   const attrs:AdminUserAttributes={user_metadata:{...user.user_metadata,username:input.username||null,player_name:input.playerName}};
   const fields=['username','player_name'];if(input.email!==(user.email??'')){attrs.email=input.email;fields.push('email');}
   await audited(id,'edit',fields,async()=>{const {error}=await db.auth.admin.updateUserById(id,attrs);if(error)throw new AdminError(409,'update','Could not save. Check for a duplicate username or email, then refresh.');});
  },
  async remove(id:string,updatedAt:string){
   if(id===ownerId)throw new AdminError(403,'owner_protected','The owner account cannot be archived.');
   const user=await fresh(id,updatedAt);if(user.app_metadata?.account_archived_at)return;
   await audited(id,'archive',['account_archived_at'],async()=>{
    const {error}=await db.rpc('archive_admin_account',{p_account:id,p_actor:ownerId,p_updated_at:updatedAt});
    if(error)throw new AdminError(error.code==='40001'?409:503,'archive','Could not archive this account. Refresh and try again.');
   });
  }
 };
}
export function configuredAdminUsersHandler(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 return createAdminUsersHandler({ownerId:ADMIN_OWNER_ID,authenticate:async token=>{if(!db)throw unavailable();return activeAuthenticatedUser(db,token);},...(db?adminUsersRepository(db,ADMIN_OWNER_ID):{list:async()=>{throw unavailable();},detail:async()=>{throw unavailable();},edit:async()=>{throw unavailable();},remove:async()=>{throw unavailable();}})});
}
