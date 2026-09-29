import {timingSafeEqual} from 'node:crypto';
import type {IncomingMessage} from 'node:http';
import {PremiumService} from './premium';
import {PremiumStripe} from './premium-stripe';
import {ApiError} from './errors';
import {uuid} from './validation';
export function validWebhookSecret(received:unknown,expected:string|undefined){return typeof received==='string'&&!!expected&&Buffer.byteLength(received)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(received),Buffer.from(expected));}
export async function premiumWebhook(req:IncomingMessage,premium:PremiumService,path:string){
 const rc=path.endsWith('/revenuecat');
 if(rc&&!validWebhookSecret(req.headers.authorization,premium.env.REVENUECAT_WEBHOOK_AUTH))throw new ApiError(401,'authentication','Invalid webhook authorization.');
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>262144)throw new ApiError(413,'too_large','Request too large.');chunks.push(Buffer.from(chunk));}
 const raw=Buffer.concat(chunks);
 if(!rc){const signature=req.headers['stripe-signature'];if(typeof signature!=='string')throw new ApiError(401,'authentication','Missing webhook signature.');await new PremiumStripe(premium).webhook(raw,signature);return;}
 const body=JSON.parse(raw.toString('utf8')),event=body?.event;if(!event||typeof event.id!=='string')throw new ApiError(400,'webhook','Invalid event.');
 // Dashboard test deliveries contain synthetic UUIDs, not PickleBash accounts.
 // Authentication and payload validation still apply; no ownership refresh is needed.
 if(event.type==='TEST')return;
 // Transfer events must refresh both accounts. Never grant from the event's claims.
 const ids=new Set([event.app_user_id,...(event.aliases??[]),...(event.transferred_from??[]),...(event.transferred_to??[])].filter(uuid));
 if(ids.size>50)throw new ApiError(400,'webhook','Too many identities.');
 for(const actor of ids)await premium.refreshApple(actor);
}
