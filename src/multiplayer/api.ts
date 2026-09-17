export class RemoteError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
export async function remoteRequest<T>(token:string,path:string,body?:unknown):Promise<T>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 let value;try{value=await response.json()}catch{throw new RemoteError(503,'unavailable','Online games are temporarily unavailable. Please reload the page and try again.');}
 if(!response.ok)throw new RemoteError(response.status,value.error?.code??'unavailable',value.error?.message??'Remote request failed.');return value as T;
}
