import {COURT,INPUT_SOURCES,PACES,SHAPES,SHOT_TYPES,TACTICS,TARGET_DEPTHS,TARGET_ZONES,PLAYER_AIMS,SPIN_SIDES,VERTICAL_SPINS,SPIN_STRENGTHS,type ShotIntent,type ShotTarget,type PlayerId,type SpinIntent} from './model';

const players:PlayerId[]=['you','partner','opponent-left','opponent-right'];
const enumSchema=(values:readonly string[])=>({type:'string',enum:values});
const objectSchema=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
/** Shared public contract for browser tools and future structured model output. */
const intentProperties={
 power:{type:'number',minimum:0,maximum:1},
 technique:enumSchema(['atp','erne']),
 schemaVersion:{type:'integer',const:1},actor:enumSchema(players),type:enumSchema(SHOT_TYPES),
 target:{oneOf:[objectSchema({kind:{const:'point'},x:{type:'number',minimum:-100,maximum:100},z:{type:'number',minimum:-100,maximum:100}}),objectSchema({kind:{const:'zone'},zone:enumSchema(TARGET_ZONES),depth:enumSchema(TARGET_DEPTHS)}),objectSchema({kind:{const:'player'},playerId:enumSchema(players),aim:enumSchema(PLAYER_AIMS)})]},
 pace:enumSchema(PACES),shape:enumSchema(SHAPES),intendedNetClearance:{type:'number',minimum:0},
 tacticalIntent:enumSchema(TACTICS),aggression:{type:'number',minimum:0,maximum:1},source:enumSchema(INPUT_SOURCES),
 spin:objectSchema({side:enumSchema(SPIN_SIDES),vertical:enumSchema(VERTICAL_SPINS),strength:enumSchema(SPIN_STRENGTHS)}),
};
export const SHOT_INTENT_SCHEMA={type:'object',properties:intentProperties,required:Object.keys(intentProperties).filter(key=>key!=='spin'&&key!=='technique'&&key!=='power'),additionalProperties:false};
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
 const keys=Object.keys(SHOT_INTENT_SCHEMA.properties),required=keys.filter(key=>key!=='spin'&&key!=='technique'&&key!=='power');
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Shot intent must be an object.');
 const v=value as Record<string,unknown>,present=Object.keys(v);
 if(required.some(key=>!Object.hasOwn(v,key))||present.some(key=>!keys.includes(key)))throw new Error(`Shot intent requires: ${required.join(', ')}, with optional spin.`);
 if(v.schemaVersion!==1)throw new Error('Unsupported shot-intent schema version.');
 let target:ShotTarget;
 if((v.target as {kind?:unknown}|null)?.kind==='point'){
  const t=object(v.target,['kind','x','z'],'Point target');
  target={kind:'point',x:number(t.x,v.type==='serve'?-100:-COURT.width/2,v.type==='serve'?100:COURT.width/2,'target x'),z:number(t.z,v.type==='serve'?-100:-COURT.length/2,v.type==='serve'?100:COURT.length/2,'target z')};
 }else if((v.target as {kind?:unknown}|null)?.kind==='zone'){
  const t=object(v.target,['kind','zone','depth'],'Zone target');
  target={kind:'zone',zone:member(t.zone,TARGET_ZONES,'target zone'),depth:member(t.depth,TARGET_DEPTHS,'target depth')};
 }else{
  const t=object(v.target,['kind','playerId','aim'],'Player target');
  if(t.kind!=='player')throw new Error('Invalid target kind.');
  target={kind:'player',playerId:member(t.playerId,players,'target player'),aim:member(t.aim,PLAYER_AIMS,'player aim')};
 }
 let spin:SpinIntent|undefined;
 if(v.spin!==undefined){const s=object(v.spin,['side','vertical','strength'],'Spin');spin={side:member(s.side,SPIN_SIDES,'spin side'),vertical:member(s.vertical,VERTICAL_SPINS,'vertical spin'),strength:member(s.strength,SPIN_STRENGTHS,'spin strength')}}
 return {...(v.power!==undefined?{power:number(v.power,0,1,'power')} : {}),schemaVersion:1,actor:member(v.actor,players,'actor'),type:member(v.type,SHOT_TYPES,'shot type'),target,
  pace:member(v.pace,PACES,'pace'),shape:member(v.shape,SHAPES,'shape'),intendedNetClearance:number(v.intendedNetClearance,0,Infinity,'net clearance'),
  tacticalIntent:member(v.tacticalIntent,TACTICS,'tactical intent'),aggression:number(v.aggression,0,1,'aggression'),source:member(v.source,INPUT_SOURCES,'input source'),...(spin?{spin}:{}),...(v.technique!==undefined?{technique:member(v.technique,['atp','erne'] as const,'technique')}:{})};
}
/** Compare normalized intent semantics; input provenance cannot change execution. */
export function sameShotIntent(a:ShotIntent,b:ShotIntent):boolean{
 const normalize=(intent:ShotIntent)=>{const {power,spin,...parsed}=parseShotIntent(intent);return {...parsed,source:'menu',power:power??.5,spin:spin??{side:'none',vertical:'none',strength:'medium'}}};
 return JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
}
export function targetLabel(target:ShotTarget):string{
 if(target.kind==='point')return `Court target · ${target.x.toFixed(2)}, ${target.z.toFixed(2)} m`;
 return target.kind==='zone'?`${target.depth} ${target.zone.replaceAll('-',' ')}`:`${target.playerId.replaceAll('-',' ')} · ${target.aim.replaceAll('-',' ')}`;
}
