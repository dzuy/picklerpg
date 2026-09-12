import {INPUT_SOURCES,PACES,SHAPES,SHOT_TYPES,TACTICS,TARGET_DEPTHS,TARGET_ZONES,PLAYER_AIMS,type ShotIntent,type ShotTarget,type PlayerId} from './model';

const players:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const enumSchema=(values:readonly string[])=>({type:'string',enum:values});
const objectSchema=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
/** Shared public contract for browser tools and future structured model output. */
export const SHOT_INTENT_SCHEMA=objectSchema({
 schemaVersion:{type:'integer',const:1},actor:enumSchema(players),type:enumSchema(SHOT_TYPES),
 target:{oneOf:[objectSchema({kind:{const:'zone'},zone:enumSchema(TARGET_ZONES),depth:enumSchema(TARGET_DEPTHS)}),objectSchema({kind:{const:'player'},playerId:enumSchema(players),aim:enumSchema(PLAYER_AIMS)})]},
 pace:enumSchema(PACES),shape:enumSchema(SHAPES),intendedNetClearance:{type:'number',minimum:0},
 tacticalIntent:enumSchema(TACTICS),aggression:{type:'number',minimum:0,maximum:1},source:enumSchema(INPUT_SOURCES),
});
function object(value:unknown,keys:string[],label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be an object.`);
 const record=value as Record<string,unknown>;
 if(Object.keys(record).length!==keys.length||keys.some(key=>!Object.hasOwn(record,key)))throw new Error(`${label} requires exactly: ${keys.join(', ')}.`);
 return record;
}
function member<T extends string>(value:unknown,values:readonly T[],label:string):T{
 if(typeof value!=='string'||!values.includes(value as T))throw new Error(`Invalid ${label}.`);
 return value as T;
}
function number(value:unknown,min:number,max:number,label:string):number{
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${label}.`);
 return value;
}
/** Structural validation only. Legal/available choices are validated by the engine. */
export function parseShotIntent(value:unknown):ShotIntent{
 const v=object(value,Object.keys(SHOT_INTENT_SCHEMA.properties),'Shot intent');
 if(v.schemaVersion!==1)throw new Error('Unsupported shot-intent schema version.');
 let target:ShotTarget;
 if((v.target as {kind?:unknown}|null)?.kind==='zone'){
  const t=object(v.target,['kind','zone','depth'],'Zone target');
  target={kind:'zone',zone:member(t.zone,TARGET_ZONES,'target zone'),depth:member(t.depth,TARGET_DEPTHS,'target depth')};
 }else{
  const t=object(v.target,['kind','playerId','aim'],'Player target');
  if(t.kind!=='player')throw new Error('Invalid target kind.');
  target={kind:'player',playerId:member(t.playerId,players,'target player'),aim:member(t.aim,PLAYER_AIMS,'player aim')};
 }
 return {schemaVersion:1,actor:member(v.actor,players,'actor'),type:member(v.type,SHOT_TYPES,'shot type'),target,
  pace:member(v.pace,PACES,'pace'),shape:member(v.shape,SHAPES,'shape'),intendedNetClearance:number(v.intendedNetClearance,0,Infinity,'net clearance'),
  tacticalIntent:member(v.tacticalIntent,TACTICS,'tactical intent'),aggression:number(v.aggression,0,1,'aggression'),source:member(v.source,INPUT_SOURCES,'input source')};
}
/** Compare normalized intent semantics; input provenance cannot change execution. */
export function sameShotIntent(a:ShotIntent,b:ShotIntent):boolean{
 return JSON.stringify({...parseShotIntent(a),source:'menu'})===JSON.stringify({...parseShotIntent(b),source:'menu'});
}
export function targetLabel(target:ShotTarget):string{
 return target.kind==='zone'?`${target.depth} ${target.zone.replaceAll('-',' ')}`:`${target.playerId.replaceAll('-',' ')} · ${target.aim.replaceAll('-',' ')}`;
}
