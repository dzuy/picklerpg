import {Match} from './match';
import {newPlayer} from './player-design';
import {SKILLS,type PlayerSkills,type PlayerId,type ShotIntent,type PointResult} from './engine/model';
import {summarizeSkills} from './player-skill-summary';
import {PERSONALITIES,type Personality} from './engine/opponent-brain';
export const EVAL_SLOTS:PlayerId[]=['you','partner','opponent-left','opponent-right'];
export interface EvalProfile {id:string;skills:PlayerSkills;handedness?:'left'|'right'}
export interface EvalScenario {id:string;a:[EvalProfile,EvalProfile];b:[EvalProfile,EvalProfile];personality?:Personality;intelligence?:number}
export const uniformSkills=(value:number)=>Object.fromEntries(SKILLS.map(key=>[key,value])) as PlayerSkills;
export function profile(id:string,value:number,overrides:Partial<PlayerSkills>={}):EvalProfile{return {id,skills:{...uniformSkills(value),...overrides}}}
const team=(id:string,value:number):[EvalProfile,EvalProfile]=>[profile(id+'-1',value),profile(id+'-2',value)];
export const DEFAULT_SCENARIOS:EvalScenario[]=[
 ...[50,70,90].map(value=>({id:`equal-${value}`,a:team('a',value),b:team('b',value)})),
 {id:'90-vs-70',a:team('a',90),b:team('b',70)},
 {id:'70-vs-50',a:team('a',70),b:team('b',50)},
 ...['serve','return','drive','drop','dink','reset','volley','counter','overhead','movement','hands'].map(skill=>({id:`${skill}-90-vs-50`,a:[profile('a-1',70,{[skill]:90}),profile('a-2',70,{[skill]:90})] as [EvalProfile,EvalProfile],b:[profile('b-1',70,{[skill]:50}),profile('b-2',70,{[skill]:50})] as [EvalProfile,EvalProfile]})),
];
const isolated=(skill:string,strong:number,weak:number):EvalScenario=>({id:`${skill}-${strong}-vs-${weak}`,a:[profile('a-1',70,{[skill]:strong}),profile('a-2',70,{[skill]:strong})],b:[profile('b-1',70,{[skill]:weak}),profile('b-2',70,{[skill]:weak})]});
const complementary=(prefix:string):[EvalProfile,EvalProfile]=>{
 const offense={serve:90,return:90,drive:90,overhead:90,movement:80},soft={drop:90,dink:90,reset:90,volley:90,counter:90,hands:90};
 return [profile(`${prefix}-attacker`,50,offense),profile(`${prefix}-controller`,50,soft)];
};
export const CALIBRATION_FAIRNESS_SCENARIOS:EvalScenario[]=[
 ...[50,70,90].map(value=>({id:`fair-equal-${value}`,a:team('a',value),b:team('b',value)})),
 {id:'fair-star-support',a:[profile('a-star',90),profile('a-support',50)],b:[profile('b-star',90),profile('b-support',50)]},
 {id:'fair-complementary',a:complementary('a'),b:complementary('b')},
 {id:'fair-all-left',a:team('a',70).map(p=>({...p,handedness:'left' as const})) as [EvalProfile,EvalProfile],b:team('b',70).map(p=>({...p,handedness:'left' as const})) as [EvalProfile,EvalProfile]},
 {id:'fair-mixed-handedness',a:[{...profile('a-right',70),handedness:'right'},{...profile('a-left',70),handedness:'left'}],b:[{...profile('b-right',70),handedness:'right'},{...profile('b-left',70),handedness:'left'}]},
 ...PERSONALITIES.map(personality=>({id:`fair-personality-${personality.toLowerCase().replaceAll(' ','-')}`,a:team('a',70),b:team('b',70),personality})),
 ...([.2,.5,.9] as const).map(intelligence=>({id:`fair-intelligence-${String(intelligence).replace('.','')}`,a:team('a',70),b:team('b',70),intelligence})),
];
export const PROGRESSION_SCENARIOS:EvalScenario[]=(['serve','return','drive','drop','dink','reset','volley','counter','overhead','movement','hands'] as const).flatMap(skill=>[isolated(skill,70,50),isolated(skill,90,70)]);
export interface SlotMetrics {player:string;shots:number;types:Record<string,number>;faults:Record<string,number>;mishits:number;qualityTotal:number;deviationTotal:number}
export interface EvalGame {
 scenario:string;seed:number;rotation:number;openingTeam:'home'|'away';status:'complete'|'capped';score:{home:number;away:number};winner:'a'|'b'|null;homeIsA:boolean;points:number;steps:number;
 slots:Record<PlayerId,SlotMetrics>;pointResults:PointResult[];rallies:{shots:number;seconds:number}[];trace?:{point:number;index:number;intent:ShotIntent;aim:unknown;firstLegEnd:unknown;feedback:unknown}[];
}
export function validateScenario(s:EvalScenario){
 if(!s||typeof s.id!=='string'||!s.id||!Array.isArray(s.a)||!Array.isArray(s.b)||s.a.length!==2||s.b.length!==2)throw new Error('Each scenario needs an id and two teams of two profiles.');
 if(s.personality!==undefined&&!PERSONALITIES.includes(s.personality))throw new Error('Invalid personality.');
 if(s.intelligence!==undefined&&(!Number.isFinite(s.intelligence)||s.intelligence<0||s.intelligence>1))throw new Error('Invalid intelligence.');
 const ids=new Set<string>();
 for(const p of [...s.a,...s.b]){
  if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id))throw new Error('Profile IDs must be unique within a scenario.');ids.add(p.id);
  if(p.handedness!==undefined&&!['left','right'].includes(p.handedness))throw new Error('Invalid handedness.');
  for(const k of SKILLS)if(!Number.isFinite(p.skills?.[k])||p.skills[k]<0||p.skills[k]>100)throw new Error(`Invalid ${k} for ${p.id}`);
 }
}
/** Exercise the actual game auto-play paths, including their current asymmetries. No network or account writes. */
export function evaluateGame(scenario:EvalScenario,seed:number,rotation=0,options:{dt?:number;maxSteps?:number;maxPoints?:number;trace?:boolean;captureReplay?:boolean;openingTeam?:'home'|'away'}={}):EvalGame{
 validateScenario(scenario);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Seed must be uint32.');
 if(!Number.isInteger(rotation)||rotation<0||rotation>3)throw new Error('Rotation must be 0–3.');
 const dt=options.dt??.1,maxSteps=options.maxSteps??100000,maxPoints=options.maxPoints??500;
 if(!Number.isFinite(dt)||dt<=0||dt>.1||!Number.isInteger(maxSteps)||maxSteps<1||!Number.isInteger(maxPoints)||maxPoints<1)throw new Error('Invalid evaluation limits.');
 const homeIsA=rotation<2,reverse=rotation%2===1;
 const home=[...(homeIsA?scenario.a:scenario.b)],away=[...(homeIsA?scenario.b:scenario.a)];if(reverse){home.reverse();away.reverse()}
 const lineup=[...home,...away],match=new Match();match.captureReplay=options.captureReplay??false;match.seed=seed;match.openingTeam=options.openingTeam??'home';match.brainMode='local';match.personality=scenario.personality??'Chess Player';match.intelligence=scenario.intelligence??.8;match.playerAutonomy=true;match.partnerAutonomy=true;
 const slots={} as Record<PlayerId,SlotMetrics>;
 for(const [i,slot] of EVAL_SLOTS.entries()){
  const p=lineup[i],design=newPlayer(p.id);design.skills={...p.skills};design.handedness=p.handedness??'right';
  match.lineup[slot]='allCourt';match.substitutePlayer(slot,design);
  slots[slot]={player:p.id,shots:0,types:{},faults:{},mishits:0,qualityTotal:0,deviationTotal:0};
 }
 match.reset();
 const result:EvalGame={scenario:scenario.id,seed,rotation,openingTeam:match.openingTeam,status:'capped',score:{home:0,away:0},winner:null,homeIsA,points:0,steps:0,slots,pointResults:[],rallies:[],...(options.trace?{trace:[]}: {})};
 let lastCount=0,pointStartStep=0;
 for(let step=0;step<maxSteps;step++){
  match.update(dt);result.steps++;
  const count=match.state.shotHistory.length;
  if(count>lastCount){
   const shot=match.shot,metric=slots[shot.actor];metric.shots++;metric.types[shot.intent.type]=(metric.types[shot.intent.type]??0)+1;
   metric.mishits+=Number(!!shot.feedback?.mishit);metric.qualityTotal+=shot.feedback?.quality??0;metric.deviationTotal+=shot.feedback?.deviation??0;
   result.trace?.push({point:match.point,index:count-1,intent:structuredClone(shot.intent),aim:{...shot.aimPoint},firstLegEnd:{...shot.legs[0].to},feedback:structuredClone(shot.feedback)});
   lastCount=count;
  }
  if(match.state.phase==='complete'){
   const end=match.state.result!;result.points++;result.pointResults.push({...end});
   result.rallies.push({shots:count,seconds:(result.steps-pointStartStep)*dt});
   if(end.playerId&&['out','net','missed-swing','failed-return','double-bounce','body-hit'].includes(end.reason)){const faults=slots[end.playerId].faults;faults[end.reason]=(faults[end.reason]??0)+1}
   if(match.scoring.winner){result.status='complete';result.winner=(match.scoring.winner==='home')===homeIsA?'a':'b';break}
   if(result.points>=maxPoints)break;
   match.nextPoint();lastCount=0;pointStartStep=result.steps;
  }
 }
 result.score={...match.scoring.score};return result;
}
export function summarizeEvaluation(games:EvalGame[]){
 return [...new Set(games.map(g=>g.scenario))].map(scenario=>{
  const all=games.filter(g=>g.scenario===scenario),done=all.filter(g=>g.status==='complete'),n=done.length;
  const aWins=done.filter(g=>g.winner==='a').length,homeWins=done.filter(g=>g.score.home>g.score.away).length;
  const rallyShots=all.flatMap(g=>g.rallies.map(r=>r.shots)).sort((a,b)=>a-b);
  const paired=new Map<number,EvalGame[]>();for(const g of done)paired.set(g.seed,[...(paired.get(g.seed)??[]),g]);
  const openings=[...new Set(all.map(g=>g.openingTeam))];
  const completeBlocks=[...paired.values()].filter(gs=>openings.every(o=>new Set(gs.filter(g=>g.openingTeam===o).map(g=>g.rotation)).size===4));
  const blocks=completeBlocks.map(gs=>gs.filter(g=>g.winner==='a').length/gs.length);
  const homeBlocks=completeBlocks.map(gs=>gs.filter(g=>g.score.home>g.score.away).length/gs.length),homeMean=homeBlocks.reduce((a,b)=>a+b,0)/(homeBlocks.length||1);
  const homeSE=homeBlocks.length>1?Math.sqrt(homeBlocks.reduce((sum,b)=>sum+(b-homeMean)**2,0)/(homeBlocks.length-1)/homeBlocks.length):null;
  const mean=blocks.reduce((a,b)=>a+b,0)/(blocks.length||1),se=blocks.length>1?Math.sqrt(blocks.reduce((sum,b)=>sum+(b-mean)**2,0)/(blocks.length-1)/blocks.length):null;
  return {scenario,games:all.length,completed:n,capped:all.length-n,aWinRate:n?aWins/n:null,homeWinRate:n?homeWins/n:null,pairedSeeds:blocks.length,pairedAWinRate:blocks.length?mean:null,pairedStandardError:se,pairedHomeStandardError:homeSE,openingWinRate:n?done.filter(g=>(g.score.home>g.score.away)===(g.openingTeam==='home')).length/n:null,
   averageMargin:n?done.reduce((sum,g)=>sum+Math.abs(g.score.home-g.score.away),0)/n:null,pickles:done.filter(g=>Math.min(g.score.home,g.score.away)===0).length,
   averagePoints:n?done.reduce((sum,g)=>sum+g.points,0)/n:null,
   rallyShots:{completedRallies:rallyShots.length,mean:rallyShots.length?rallyShots.reduce((a,b)=>a+b,0)/rallyShots.length:null,p95:rallyShots.length?rallyShots[Math.ceil(rallyShots.length*.95)-1]:null,max:rallyShots.at(-1)??null},
   slots:Object.fromEntries(EVAL_SLOTS.map(slot=>{const metrics=done.map(g=>g.slots[slot]),shots=metrics.reduce((sum,m)=>sum+m.shots,0);const types:Record<string,number>={},faults:Record<string,number>={};for(const m of metrics){for(const [k,v] of Object.entries(m.types))types[k]=(types[k]??0)+v;for(const [k,v] of Object.entries(m.faults))faults[k]=(faults[k]??0)+v}return [slot,{shots,types,faults,mishitRate:shots?metrics.reduce((s,m)=>s+m.mishits,0)/shots:null,meanQuality:shots?metrics.reduce((s,m)=>s+m.qualityTotal,0)/shots:null,meanDeviation:shots?metrics.reduce((s,m)=>s+m.deviationTotal,0)/shots:null}]}))};
 });
}
export function describeProfiles(s:EvalScenario){return [...s.a,...s.b].map(p=>({...p,estimatedDupr:summarizeSkills(p.skills).estimatedDupr}))}
