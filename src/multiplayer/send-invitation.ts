import {RemoteError} from './api';
import type {InviteRequest} from './invitation-protocol';

/** Keep the same request on uncertain failures; replace only definitively rejected drafts. */
export async function sendInvitationDraft(saved:string|null,fresh:()=>Promise<InviteRequest>,persist:(value:string|null)=>void,send:(request:InviteRequest)=>Promise<unknown>){
 let request:InviteRequest;
 try{request=saved?JSON.parse(saved):await fresh()}catch(error){persist(null);throw error}
 const submit=async()=>{persist(JSON.stringify(request));await send(request)};
 try{await submit()}catch(error){
  if(!(error instanceof RemoteError)||error.status!==400)throw error;
  persist(null);
  if(!saved)throw error;
  request=await fresh();
  try{await submit()}catch(retryError){if(retryError instanceof RemoteError&&retryError.status===400)persist(null);throw retryError}
 }
 persist(null);
}
