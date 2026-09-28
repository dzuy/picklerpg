import type {GameplayRecord} from '../../src/persistence/gameplay-record';
import type {Team,PlayerSkills} from '../../src/engine/model';

export function analysisFacts(records:GameplayRecord[],viewerTeam:Team){
 const points=[...records].sort((a,b)=>a.pointIndex-b.pointIndex);
 const players:Record<string,{team:Team;label:string;rating:number;skills:PlayerSkills;shots:number;fireballs:number;types:Record<string,number>;targets:Record<string,number>;sources:Record<string,number>;powerTotal:number}>={};
 for(const [slot,p] of Object.entries(points.at(-1)?.roster??{})){
  const team=slot==='you'||slot==='partner'?'home':'away',first=slot==='you'||slot==='opponent-left';
  players[slot]={team,label:team===viewerTeam?(first?'Your first player':'Your partner'):(first?'Opponent 1':'Opponent 2'),rating:p.rating,skills:p.skills,shots:0,fireballs:0,types:{},targets:{},sources:{},powerTotal:0};
 }
 const rallies=points.map(point=>{
  const shots=point.events.filter(e=>e.type==='shot');
  for(const e of shots){const p=players[e.intent.actor];if(!p)continue;p.shots++;p.types[e.intent.type]=(p.types[e.intent.type]??0)+1;const target=e.intent.target;const zone=target.kind==='point'?(Math.abs(target.z)>4?'deep':'short')+(Math.abs(target.x)<1?' middle':' wide'):target.kind==='zone'?`${target.depth} ${target.zone}`:target.aim;p.targets[zone]=(p.targets[zone]??0)+1;p.sources[e.intent.source]=(p.sources[e.intent.source]??0)+1;p.powerTotal+=e.intent.power??.5;p.fireballs+=Number((e.intent.power??.5)>=.8);}
  const result=point.events.find(e=>e.type==='point-end');
  return {rally:point.pointIndex+1,complete:point.complete,scoreAfter:point.score,result:result?.type==='point-end'?result.result:null,shots:shots.map(e=>({player:players[e.intent.actor]?.label??e.intent.actor,type:e.intent.type,power:Math.round((e.intent.power??.5)*100),target:e.intent.target,source:e.intent.source}))};
 });
 const complete=points.length>0&&points.every((p,i)=>p.pointIndex===i&&p.complete)&&points.at(-1)!.gameComplete&&!points.some(p=>p.endedEarly);
 const coverage={complete,rallies:rallies.length,shots:Object.values(players).reduce((n,p)=>n+p.shots,0),fireballs:Object.values(players).reduce((n,p)=>n+p.fireballs,0)};
 // Exact aggregates cover all available shots; a few real rally sequences keep the report specific.
 const featured=[rallies.at(-1),[...rallies].sort((a,b)=>b.shots.length-a.shots.length)[0],[...rallies].sort((a,b)=>b.shots.filter(s=>s.type==='counter').length-a.shots.filter(s=>s.type==='counter').length)[0]].filter((p,i,a)=>p&&a.findIndex(x=>x?.rally===p.rally)===i).map(p=>({...p,shots:p!.shots.slice(0,40),sequenceTruncated:p!.shots.length>40}));
 return {viewerTeam,coverage,rules:points.at(-1)?.rules,finalScore:points.at(-1)?.score,players:Object.values(players).map(({powerTotal,...p})=>({...p,averagePower:p.shots?Math.round(powerTotal/p.shots*100):null})),rallies:rallies.map(({shots,...r})=>({...r,shotCount:shots.length})),featured};
}

/** Counts describe shot selection, never shot effectiveness or real-world skill. */
export function analysisShotStats(facts:ReturnType<typeof analysisFacts>){
 const counts=new Map<string,{type:string;you:number;opponents:number}>();
 for(const player of facts.players)for(const [type,count] of Object.entries(player.types)){
  const row=counts.get(type)??{type,you:0,opponents:0};
  row[player.team===facts.viewerTeam?'you':'opponents']+=count;counts.set(type,row);
 }
 return [...counts.values()].sort((a,b)=>(b.you+b.opponents)-(a.you+a.opponents)||a.type.localeCompare(b.type));
}
