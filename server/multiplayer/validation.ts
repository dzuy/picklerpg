import {createHash} from 'node:crypto';
import {parseShotIntent} from '../../src/engine/shot-intent';
import {SLOTS} from '../../src/engine/checkpoint';
import {validatePlayer} from '../../src/player-design';
import type {CreateRemoteMatch,RemoteAction} from '../../src/multiplayer/protocol';
import {ApiError} from './errors';
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function bad():never{throw new ApiError(400,'invalid_request','The request is invalid.');}
function exact(v:any,required:string[],optional:string[]=[]){if(!v||typeof v!=='object'||Array.isArray(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...required,...optional].includes(k)))bad();}
export function parseAction(value:unknown):RemoteAction{
 const v:any=value;exact(v,['actionId','expectedVersion','decisionId','action']);
 if(!uuid(v.actionId)||!Number.isSafeInteger(v.expectedVersion)||v.expectedVersion<0||typeof v.decisionId!=='string'||v.decisionId.length>150)bad();
 exact(v.action,['kind','intent'],['timing']);if(v.action.kind!=='play_shot'||v.action.timing!==undefined&&!['air','bounce'].includes(v.action.timing))bad();
 let intent;try{intent=parseShotIntent(v.action.intent)}catch{bad()}
 if(intent!.intendedNetClearance>10)bad();
 // Input provenance cannot change the accepted action or its retry hash.
 return {actionId:v.actionId.toLowerCase(),expectedVersion:v.expectedVersion,decisionId:v.decisionId,action:{kind:'play_shot',intent:{...intent!,source:'menu',spin:intent!.spin??{side:'none',vertical:'none',strength:'medium'}},...(v.action.timing?{timing:v.action.timing}:{})}};
}
export function parseCreation(value:unknown):CreateRemoteMatch{
 const v:any=value;exact(v,['creationId','opponentId','roster','scoring']);
 if(!uuid(v.creationId)||!uuid(v.opponentId)||!['rally-doubles','side-out-doubles'].includes(v.scoring))bad();exact(v.roster,SLOTS);
 const roster={} as CreateRemoteMatch['roster'];for(const id of SLOTS){try{roster[id]=validatePlayer(v.roster[id])}catch{bad()}}
 return {creationId:v.creationId.toLowerCase(),opponentId:v.opponentId.toLowerCase(),roster,scoring:v.scoring};
}
function canonical(v:any):any{return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
export function requestHash(value:unknown){return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
