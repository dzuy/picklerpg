import {ApiError} from './errors';
import {publicStrategy,type MatchStrategy} from '../../src/multiplayer/strategy';
import {addShotMix,emptyShotMix,type ShotMixDashboard,type ShotMixFilter} from '../../src/multiplayer/shot-mix';
import type {MatchRepository} from './repository';
export interface ShotMixRow {id:string;completed_at:string;opponent_id:string;engine_version:string;rules:{target:number;winBy:number;scoring:string};athletes:Record<string,string>;summary:MatchStrategy|null}
export function shotMixFilter(params:URLSearchParams):ShotMixFilter {
 const bad=()=>{throw new ApiError(400,'filter','Choose a valid shot-mix filter.');};
 for(const k of params.keys())if(!['scope','opponent','athlete','stage'].includes(k)||params.getAll(k).length!==1)bad();
 const scope=params.get('scope')??'recent',stage=params.get('stage')??'all',opponent=params.get('opponent')??undefined,athlete=params.get('athlete')??undefined;
 if(!['recent','month','lifetime'].includes(scope)||!['all','serve','return','third','fourth','later','unknown'].includes(stage))bad();
 if(opponent&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(opponent))bad();
 if(athlete&&(athlete.length>200||/[\x00-\x1f]/.test(athlete)))bad();
 return {scope:scope as ShotMixFilter['scope'],stage:stage as ShotMixFilter['stage'],...(opponent?{opponent:opponent.toLowerCase()}:{}),...(athlete?{athlete}: {})};
}
export async function personalShotMix(repo:MatchRepository,actor:string,filter:ShotMixFilter,names:ReadonlyMap<string,string>,now=new Date()):Promise<ShotMixDashboard>{
 if(!repo.shotMixPage||!repo.strategy)throw new ApiError(503,'unavailable','Shot mix is unavailable.');
 const output:ShotMixDashboard={definitionVersion:'shot-mix-1',filter,totals:emptyShotMix(),recent:emptyShotMix(),previous:emptyShotMix(),opponents:[],athletes:[]};
 const opponents=new Map<string,string>(),athletes=new Map<string,string>();let cursor:ShotMixRow|undefined,rank=0;const seen=new Set<string>();
 for(;;){
  const rows=await repo.shotMixPage(actor,now.toISOString(),cursor?.completed_at??null,cursor?.id??null);if(!rows.length)break;
  for(const row of rows){
   if(seen.has(row.id))throw new Error('Duplicate shot-mix page');seen.add(row.id);
   opponents.set(row.opponent_id,names.get(row.opponent_id)??'Previous opponent');
   for(const [id,name] of Object.entries(row.athletes))if(!athletes.has(id))athletes.set(id,name);
   if(filter.opponent&&row.opponent_id!==filter.opponent||filter.athlete&&!Object.hasOwn(row.athletes,filter.athlete))continue;
   const index=rank++,withinMonth=Date.parse(row.completed_at)>=now.getTime()-30*86400000;
   const include=filter.scope==='lifetime'||filter.scope==='month'&&withinMonth||filter.scope==='recent'&&index<10;
   if(!include&&index>=20)continue;
   let summary:MatchStrategy|null=null;
   try{const raw=row.summary??await repo.strategy(row.id,actor);if(raw)summary=publicStrategy(raw);}catch{console.warn('A shot-mix summary is unavailable');}
   const rules=`${row.rules.scoring}/${row.rules.target}/${row.rules.winBy}`;
   if(include)addShotMix(output.totals,summary,filter,row.engine_version,rules);
   if(index<10)addShotMix(output.recent,summary,filter,row.engine_version,rules);
   else if(index<20)addShotMix(output.previous,summary,filter,row.engine_version,rules);
  }
  cursor=rows.at(-1);if(rows.length<50)break;
 }
 output.opponents=[...opponents].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 output.athletes=[...athletes].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 return output;
}
