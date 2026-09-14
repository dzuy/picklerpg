import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient} from '@supabase/supabase-js';
import {MatchService} from './service';
import {SupabaseMatchRepository} from './repository';
import {ApiError} from './errors';
import {uuid} from './validation';
export type Authenticate=(token:string)=>Promise<string>;
function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));}
async function body(req:IncomingMessage){
 if(!req.headers['content-type']?.startsWith('application/json'))throw new ApiError(415,'content_type','Send JSON.');
 let size=0;const chunks:Buffer[]=[];
 for await(const chunk of req){size+=chunk.length;if(size>32768)throw new ApiError(413,'too_large','Request is too large.');chunks.push(Buffer.from(chunk));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'invalid_json','Invalid JSON.');}
}
export function createMatchHandler(service:MatchService,authenticate:Authenticate){
 const buckets=new Map<string,{start:number;count:number}>();
 function limit(key:string,max:number){const now=Date.now();let b=buckets.get(key);if(!b||now-b.start>=60000){if(buckets.size>=5000)for(const [k,v] of buckets)if(now-v.start>=60000)buckets.delete(k);if(buckets.size>=5000)throw new ApiError(429,'busy','Try again shortly.');b={start:now,count:0};buckets.set(key,b);}if(++b.count>max)throw new ApiError(429,'rate_limited','Too many requests. Try again shortly.');}
 return async(req:IncomingMessage,res:ServerResponse)=>{
  try{
   // No cookie authority and no cross-origin write API. Bearer tokens are verified remotely.
   const origin=req.headers.origin;
   if(origin){let host;try{host=new URL(origin).host}catch{throw new ApiError(403,'origin','Invalid origin.');}if(host!==req.headers.host)throw new ApiError(403,'origin','This origin is not allowed.');}
   limit(`ip:${req.socket.remoteAddress}`,300);
   const token=req.headers.authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];if(!token||token.length>8192)throw new ApiError(401,'authentication','Sign in to open this match.');
   const actor=await authenticate(token);if(!uuid(actor))throw new ApiError(401,'authentication','Sign in again.');
   limit(`user:${actor}`,180);
   const pathname=new URL(req.url!,'http://localhost').pathname;
   if(pathname==='/api/multiplayer/config'&&req.method==='GET'){send(res,200,service.config(actor));return;}
   if(pathname==='/api/matches'){
    if(req.method==='GET'){send(res,200,await service.list(actor));return;}
    if(req.method==='POST'){limit(`create:${actor}`,6);send(res,201,await service.create(actor,await body(req)));return;}
   }
   const match=pathname.match(/^\/api\/matches\/([^/]+)(\/actions)?$/);
   if(match&&uuid(match[1])){
    const id=match[1].toLowerCase();
    if(req.method==='GET'&&!match[2]){send(res,200,await service.get(id,actor));return;}
    if(req.method==='POST'&&match[2]){limit(`act:${actor}`,60);send(res,200,await service.act(id,actor,await body(req)));return;}
   }
   throw new ApiError(404,'not_found','Remote endpoint not found.');
  }catch(error){const e=error instanceof ApiError?error:new ApiError(503,'unavailable','Remote play is temporarily unavailable. Retry the same action.');send(res,e.status,{error:{code:e.code,message:e.message}});}
 };
}
export function configuredMatchHandler(env:NodeJS.ProcessEnv=process.env){
 const unavailable=(message:string)=>async(_req:IncomingMessage,res:ServerResponse)=>send(res,503,{error:{code:'disabled',message}});
 if(env.MULTIPLAYER_ENABLED!=='true')return unavailable('Remote play is not enabled on this server.');
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return unavailable('Remote play needs server database configuration.');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const testers=new Map<string,string>();
 for(const [index,id] of (env.MULTIPLAYER_TESTER_IDS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).entries()){
  if(!uuid(id))throw new Error('MULTIPLAYER_TESTER_IDS must contain UUIDs.');testers.set(id,`Tester ${index+1}`);
 }
 const authenticate:Authenticate=async token=>{const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new ApiError(401,'authentication','Your session expired. Sign in again, then retry.');return data.user.id;};
 return createMatchHandler(new MatchService(new SupabaseMatchRepository(client),testers,env.MULTIPLAYER_CREATE_ENABLED==='true'),authenticate);
}
