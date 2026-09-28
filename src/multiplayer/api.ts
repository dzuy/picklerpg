import {apiUrl} from '../native-origin';
export class RemoteError extends Error {constructor(public status:number,public code:string,message:string,public retryAfter=0){super(message)}}
const cooldowns=new Map<string,number>();
export async function remoteRequest<T>(token:string,path:string,body?:unknown):Promise<T>{
 const key=token+':'+(body===undefined?'read':/^\/api\/matches\/[^/]+\/actions$/.test(path)?'turn':path);
 const now=Date.now();for(const [k,until] of cooldowns)if(until<=now)cooldowns.delete(k);
 const remaining=(cooldowns.get(key)??0)-now;
 if(remaining>0)throw new RemoteError(429,'rate_limited','Too many requests. Please wait a moment.',Math.ceil(remaining/1000));
 const response=await fetch(apiUrl(path),{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 let retryAfter=0;
 if(response.status===429){const header=response.headers.get('Retry-After');const seconds=header&&/^\d+$/.test(header)?Number(header):header?Math.ceil((Date.parse(header)-Date.now())/1000):5;retryAfter=Number.isFinite(seconds)?Math.max(1,Math.min(300,seconds)):5;cooldowns.set(key,Date.now()+retryAfter*1000);}
 let value;try{value=await response.json()}catch{throw new RemoteError(503,'unavailable','Online games are temporarily unavailable. Please reload the page and try again.');}
 if(!response.ok)throw new RemoteError(response.status,value.error?.code??'unavailable',value.error?.message??'Remote request failed.',retryAfter);if(typeof window!=='undefined'&&(path.startsWith('/api/matches')||path.startsWith('/api/invitations')))window.dispatchEvent(new CustomEvent('pickle-game-refreshed',{detail:{path,value,method:body===undefined?'GET':'POST'}}));return value as T;
}
