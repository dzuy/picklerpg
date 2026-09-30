import {createHash} from 'node:crypto';
import {inflateSync,deflateSync} from 'node:zlib';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {ApiError} from './errors';
import {uuid} from './validation';
import {clientAddress,databaseRateLimits,memoryRateLimits,RateLimitError,type RateLimitStore} from './rate-limit';
export const PLAYER_CARD_BUCKET='player-cards';
export const MAX_CARD_BYTES=4*1024*1024;
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(bytes:Buffer){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),out.length-4);return out;}
/** Validate dimensions/decompression bounds and strip all metadata before public hosting. */
export function cleanCardPng(input:Buffer){
 const invalid=()=>new ApiError(400,'invalid_card','Send a generated player card image.');
 if(input.length>MAX_CARD_BYTES)throw new ApiError(413,'too_large','This card image is too large.');
 if(!input.subarray(0,8).equals(signature))throw invalid();
 let offset=8,header:Buffer|undefined,ended=false;const data:Buffer[]=[];
 while(offset+12<=input.length){const size=input.readUInt32BE(offset),end=offset+12+size;if(end>input.length)throw invalid();const type=input.toString('ascii',offset+4,offset+8),value=input.subarray(offset+8,end-4);
  if(crc32(input.subarray(offset+4,end-4))!==input.readUInt32BE(end-4))throw invalid();
  if(offset===8&&type!=='IHDR')throw invalid();
  if(type==='IHDR'){if(header||size!==13)throw invalid();header=Buffer.from(value);}
  else if(type==='IDAT')data.push(value);
  else if(type==='IEND'){if(size||end!==input.length)throw invalid();ended=true;break;}
  else if(!['sRGB','gAMA','cHRM','pHYs','tEXt','iTXt'].includes(type))throw invalid();
  offset=end;
 }
 if(!header||!ended||!data.length||header.readUInt32BE(0)!==1080||header.readUInt32BE(4)!==1350||header[8]!==8||![2,6].includes(header[9])||header[10]||header[11]||header[12])throw invalid();
 const row=1080*(header[9]===6?4:3)+1,expected=row*1350;let raw:Buffer;
 try{raw=inflateSync(Buffer.concat(data),{maxOutputLength:expected});}catch{throw invalid();}
 if(raw.length!==expected)throw invalid();for(let y=0;y<1350;y++)if(raw[y*row]>4)throw invalid();
 return Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export async function publishCard(client:SupabaseClient,input:Buffer,owner:string){
 if(!uuid(owner))throw new ApiError(401,'card_owner','Sign in before publishing a card.');
 const image=cleanCardPng(input),path=`v2/${owner}/${createHash('sha256').update(image).digest('hex')}.png`;
 const {error:ownershipError}=await client.from('published_player_cards').upsert({owner_id:owner,path},{onConflict:'path'});if(ownershipError)throw new ApiError(503,'card_upload','Your card could not be published. You can download it or try again.');
 const {error}=await client.storage.from(PLAYER_CARD_BUCKET).upload(path,image,{contentType:'image/png',cacheControl:'31536000',upsert:false});
 if(error&&!['409','Duplicate'].includes(String((error as {statusCode?:string}).statusCode)))throw new ApiError(503,'card_upload','Your card could not be published. You can download it or try again.');
 return {url:client.storage.from(PLAYER_CARD_BUCKET).getPublicUrl(path).data.publicUrl};
}
export function createPlayerCardHandler(publish:(image:Buffer,owner:string)=>Promise<{url:string}>,limits:RateLimitStore=memoryRateLimits(),trustedHops=0,authenticate:(token:string)=>Promise<string|null>=async()=>null){
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const send=(status:number,value:unknown)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));
  try{
   if(req.method!=='POST'){res.setHeader('Allow','POST');send(405,{error:{message:'Use POST.'}});return;}
   const origin=req.headers.origin;if(origin&&origin!=='capacitor://localhost'){let host;try{host=new URL(origin).host;}catch{throw new ApiError(403,'origin','Invalid origin.');}if(host!==req.headers.host)throw new ApiError(403,'origin','This origin is not allowed.');}
   // Persistent guest sessions can publish; every hosted card has a deletable owner.
   const token=/^Bearer (.+)$/.exec(req.headers.authorization??'')?.[1],owner=token?await authenticate(token):null;if(!owner)throw new ApiError(401,'card_owner','Open Play must be signed in before publishing. You can still download your card.');
   for(const [key,max] of [[`player-card:${clientAddress(req,trustedHops)}`,6],['player-card:global',60]] as const){const delay=await limits(key,max);if(delay)throw new RateLimitError(delay);}
   if(req.headers['content-type']?.split(';')[0]!=='image/png')throw new ApiError(415,'content_type','Send a PNG card image.');
   if(Number(req.headers['content-length'])>MAX_CARD_BYTES)throw new ApiError(413,'too_large','This card image is too large.');
   const chunks:Buffer[]=[];let size=0;for await(const part of req){size+=part.length;if(size>MAX_CARD_BYTES)throw new ApiError(413,'too_large','This card image is too large.');chunks.push(Buffer.from(part));}
   send(201,await publish(Buffer.concat(chunks),owner));
  }catch(error){const e=error instanceof ApiError?error:new ApiError(503,'card_upload','Your card could not be published. You can download it or try again.');if(e instanceof RateLimitError)res.setHeader('Retry-After',String(e.retryAfter));send(e.status,{error:{code:e.code,message:e.message}});}
 };
}
export function configuredPlayerCardHandler(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return createPlayerCardHandler(async()=>{throw new ApiError(503,'card_storage','Card publishing is not configured. You can still download your card.');});
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 return createPlayerCardHandler((image,owner)=>publishCard(client,image,owner),env.RATE_LIMIT_STORE==='database'?databaseRateLimits(client):memoryRateLimits(),Number(env.TRUSTED_PROXY_HOPS??0),async token=>{const {data,error}=await client.auth.getUser(token);return error?null:data.user?.id??null;});
}
