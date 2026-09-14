import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CALIBRATION_FAIRNESS_SCENARIOS,DEFAULT_SCENARIOS,PROGRESSION_SCENARIOS,evaluateGame,summarizeEvaluation,describeProfiles,validateScenario,type EvalGame,type EvalScenario} from '../src/game-evaluation';
const args=process.argv.slice(2),known=['seeds','seed','scenario','config','suite','out','trace','rotation','max-steps','max-points','opening-team'];
const opts:Record<string,string>={};
for(let i=0;i<args.length;i++){const k=args[i].replace(/^--/,'');if(!args[i].startsWith('--')||!known.includes(k)||!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Use --${known.join(', --')} with values`);opts[k]=args[++i]}
const maxSteps=Number(opts['max-steps']??25000),maxPoints=Number(opts['max-points']??150);
if(!Number.isInteger(maxSteps)||maxSteps<1||!Number.isInteger(maxPoints)||maxPoints<1)throw new Error('Invalid simulation caps');
const seeds=Number(opts.seeds??5),first=Number(opts.seed??1741);
if(!Number.isInteger(seeds)||seeds<1||!Number.isInteger(first)||first<0||first+seeds-1>0xffffffff)throw new Error('Invalid seed range');
if(opts.config&&opts.suite)throw new Error('Use either --config or --suite, not both');
const suites:Record<string,EvalScenario[]>={default:DEFAULT_SCENARIOS,'calibration-fairness':CALIBRATION_FAIRNESS_SCENARIOS,progression:PROGRESSION_SCENARIOS};
if(opts.suite&&!suites[opts.suite])throw new Error(`Unknown suite: ${opts.suite}`);
let scenarios:EvalScenario[]=opts.config?JSON.parse(readFileSync(opts.config,'utf8')):suites[opts.suite??'default'];
if(!Array.isArray(scenarios))throw new Error('Config must be an array of scenarios');scenarios.forEach(validateScenario);
if(new Set(scenarios.map(s=>s.id)).size!==scenarios.length)throw new Error('Scenario IDs must be unique');
if(opts.scenario){const requested=opts.scenario.split(',');for(const id of requested)if(!scenarios.some(s=>s.id===id))throw new Error(`Unknown scenario: ${id}`);scenarios=scenarios.filter(s=>requested.includes(s.id));}if(!scenarios.length)throw new Error('No matching scenarios');
const openings=opts['opening-team']==='both'||opts['opening-team']===undefined?['home','away'] as const:[opts['opening-team']];
if(openings.some(t=>!['home','away'].includes(t)))throw new Error('Opening team must be home, away or both');
const rotations=opts.rotation===undefined?[0,1,2,3]:[Number(opts.rotation)];
if(rotations.some(r=>!Number.isInteger(r)||r<0||r>3))throw new Error('Rotation must be 0–3');
const out=resolve(opts.out??`evaluation/run-${new Date().toISOString().replace(/[:.]/g,'-')}`);mkdirSync(out,{recursive:true});
let git={};try{git={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()}}catch{}
const hash=createHash('sha256');
for(const file of readdirSync('src',{recursive:true}).filter(f=>/\.(ts|json)$/.test(String(f))).map(String).sort()){hash.update(file);hash.update(readFileSync(resolve('src',file)))}
const manifest={version:1,sourceHash:hash.digest('hex'),...git,node:process.version,createdAt:new Date().toISOString(),dt:.1,captureReplay:false,maxSteps,maxPoints,policy:'Current local auto-play; allCourt tendencies; no LLM; opening servers as listed in manifest',firstSeed:first,seeds,rotations,openings,scenarios:scenarios.map(s=>({...s,profiles:describeProfiles(s)}))};
writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(resolve(out,'games.jsonl'),'');
const games:EvalGame[]=[];
for(const scenario of scenarios){
 for(let offset=0;offset<seeds;offset++)for(const rotation of rotations)for(const openingTeam of openings){const g=evaluateGame(scenario,first+offset,rotation,{trace:opts.trace==='true',maxSteps,maxPoints,openingTeam:openingTeam as 'home'|'away'});games.push(g);writeFileSync(resolve(out,'games.jsonl'),JSON.stringify(g)+'\n',{flag:'a'});}
 console.log(`${scenario.id}: ${seeds*rotations.length*openings.length} games finished`);
 const summary=summarizeEvaluation(games);writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2));
}
const summary=summarizeEvaluation(games),pct=(x:number|null)=>x===null?'—':`${(x*100).toFixed(1)}%`;
const md=['# Match evaluation','',`Policy: ${manifest.policy}. ${games.length} games. Fixed simulation step: 0.1 s.`, '', '| Scenario | Completed / capped | A wins | Home wins | Mean margin | Pickles | Paired seeds |','|---|---:|---:|---:|---:|---:|---:|',...summary.map(s=>`| ${s.scenario} | ${s.completed} / ${s.capped} | ${pct(s.aWinRate)} | ${pct(s.homeWinRate)} | ${s.averageMargin?.toFixed(2)??'—'} | ${s.pickles} | ${s.pairedSeeds} |`),'','A/B refer to the configured teams, regardless of court side. Results use the rotations and opening servers listed in the manifest. A complete four-rotation block exercises both side assignments and both within-team orders. Mirrored games are correlated; summary.json reports standard error across complete seed blocks, not independent-game confidence intervals. Small batches are smoke tests, not balance certification.','', 'See summary.json for per-slot shot counts, fault counts, mishit rates, mean execution quality and deviation. Capped games are excluded from outcome averages and reported explicitly. games.jsonl contains each seed, rotation, score, slot-to-player mapping and point outcomes. Use --trace true for shot intent, aim, first-leg endpoint and execution feedback. A first-leg endpoint is not necessarily a landing for intercepted shots.',''];
md.push('## Rally length','', 'Shot counts include the serve and return. These are completed rallies, including those in capped games; an unfinished rally is excluded. Percentiles describe the simulated sample, not independent statistical trials.','', '| Scenario | Completed rallies | Mean shots | 95th percentile | Longest |','|---|---:|---:|---:|---:|',...summary.map(s=>`| ${s.scenario} | ${s.rallyShots.completedRallies} | ${s.rallyShots.mean?.toFixed(1)??'—'} | ${s.rallyShots.p95??'—'} | ${s.rallyShots.max??'—'} |`),'');
writeFileSync(resolve(out,'report.md'),md.join('\n'));console.log(`Report: ${out}/report.md`);if(games.some(g=>g.status==='capped'))process.exitCode=2;
