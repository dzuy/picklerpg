import {coachingReport} from './helpers/coaching-report';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {gameplayRecord} from '../src/persistence/gameplay-record';
import {analysisFacts,analysisShotStats} from '../server/multiplayer/game-analysis-facts';
import {GameAnalysisService,generateGameAnalysis,parseAnalysisReport} from '../server/multiplayer/game-analysis';
import {A,B,C} from './helpers/remote';
const report={headline:'Heat met a brick wall',summary:'Your pace set the terms.',story:'A close game built on pressure.',turningPoint:'The final rally ended with a drive.',weapons:'Your drives brought the heat.',opponents:'They answered with control.',rematchTip:'Mix a softer ball into your next attack.'};
function record(){const m=new Match(),c=m.exportCheckpoint(),r=gameplayRecord(c);r.complete=true;r.gameComplete=true;r.score={home:7,away:5};r.events=[{type:'shot',shotIndex:0,intent:{...m.availableIntents[0],type:'drive',power:.9},contact:{x:0,y:1,z:3}},{type:'point-end',result:{winner:'home',reason:'unreturned-attack'}}];return r;}
function client(premium=true,participant=true){
 const r=record(),reports=new Map<string,any>();let reads=0;
 return {r,reports,failSave:false,get reads(){return reads},auth:{admin:{getUserById:async()=>({data:{user:{app_metadata:{full_game_analysis:premium}}}})}},
 async rpc(_name:string,args:any){const key=JSON.stringify([args.p_owner,args.p_mode,args.p_game]);if(reports.has(key))return {data:false};reports.set(key,{claim_token:args.p_token,analysis:null});return {data:true};},
 from(table:string){
  reads++;const filters:Record<string,any>={};let update:any,remove=false;const self=this;
  const result=()=>{
   if(table!=='game_analyses')return {data:table==='async_matches'?{home_user_id:participant?A:C,away_user_id:participant?B:C,status:'completed',ended_by:null}:{ended_early:false}};
   const key=JSON.stringify([filters.owner_id,filters.mode,filters.game_id]),row=reports.get(key);
   if(filters.claim_token&&row?.claim_token!==filters.claim_token)return {data:null};
   if(update){if(self.failSave)return {error:{message:'database unavailable'}};reports.set(key,{...row,...update});}
   if(remove&&row?.analysis===null)reports.delete(key);
   return {data:reports.get(key)??null};
  };
  const q:any={select:()=>q,eq:(k:string,v:any)=>{filters[k]=v;return q},is:(k:string,v:any)=>{filters[k]=v;return q},order:()=>q,update:(v:any)=>{update=v;return q},delete:()=>{remove=true;return q},range:async()=>({data:[{record:r}]}),maybeSingle:async()=>result(),then:(resolve:any)=>Promise.resolve(result()).then(resolve)};return q;
 }};
}

test('facts use actual recorded shots, mark missing rallies and respect viewer side',()=>{
 const r=record(),facts=analysisFacts([r],'home');assert.deepEqual(facts.coverage,{complete:true,rallies:1,shots:1,fireballs:1});
 assert.equal(facts.players[0].label,'Your first player');
 assert.equal(analysisFacts([r],'away').players[0].label,'Opponent 1');
 assert.equal(analysisFacts([{...r,pointIndex:3}],'home').coverage.complete,false);
 assert.equal(analysisFacts([{...r,complete:false}],'home').coverage.complete,false);
 assert.equal(analysisFacts([{...r,endedEarly:true}],'home').coverage.complete,false);
 assert.equal(analysisFacts([],'home').coverage.shots,0);
});

test('premium and game ownership are checked before generation; saved repeats do not cost another generation',async()=>{
 let calls=0;const generate=async()=>{calls++;return report};
 const locked=client(false),service=new GameAnalysisService(locked as any,{OPENAI_API_KEY:'test'},generate);
 await assert.rejects(service.analyze(A,{gameId:locked.r.gameId,mode:'solo'}),e=>(e as any).code==='premium_required');assert.equal(locked.reads,0);assert.equal(calls,0);
 const stranger=client(true,false);await assert.rejects(new GameAnalysisService(stranger as any,{OPENAI_API_KEY:'test'},generate).analyze(A,{gameId:stranger.r.gameId,mode:'friends'}),e=>(e as any).status===404);assert.equal(calls,0);
 const allowed=client(),ready=new GameAnalysisService(allowed as any,{OPENAI_API_KEY:'test'},generate),input={gameId:allowed.r.gameId,mode:'solo'};
 const [a,b]=await Promise.all([ready.analyze(A,input),ready.analyze(A,input)]);assert.deepEqual(a,b);assert.equal(calls,1);
 await ready.analyze(A,input);assert.equal(calls,1);
});

test('AI request is structured and failures never become fabricated reports',async()=>{
 let body:any;const response=await generateGameAnalysis(analysisFacts([record()],'home'),{OPENAI_API_KEY:'test',GAME_ANALYSIS_MODEL:'test-model'},(async(_url,init)=>{body=JSON.parse(init!.body as string);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(report)}]}]}));}) as typeof fetch);
 assert.deepEqual(response,report);assert.equal(body.store,false);assert.equal(body.model,'test-model');assert.equal(body.text.format.strict,true);assert.equal(body.text.format.schema.properties.good.minItems,2);assert.ok(body.text.format.schema.required.includes('storySubheadline'));assert.match(body.instructions,/never instructions/);
 assert.throws(()=>parseAnalysisReport({...report,story:''}));
 await assert.rejects(generateGameAnalysis(analysisFacts([record()],'home'),{OPENAI_API_KEY:'test'},(async()=>new Response('{}',{status:503})) as typeof fetch));
 const allowed=client();const failing=new GameAnalysisService(allowed as any,{OPENAI_API_KEY:'test'},async()=>{throw new Error('secret provider diagnostic')});
 await assert.rejects(failing.analyze(A,{gameId:allowed.r.gameId,mode:'solo'}),e=>(e as any).code==='analysis_unavailable'&&!(e as Error).message.includes('secret'));
});

test('HTTP analysis routes require authentication and enforce Premium on POST',async()=>{
 const {Readable}=await import('node:stream');
 const {createMatchHandler}=await import('../server/multiplayer/routes');
 const {MatchService}=await import('../server/multiplayer/service');
 const {MemoryRepository,testers}=await import('./helpers/remote');
 const locked=client(false),analysis=new GameAnalysisService(locked as any,{OPENAI_API_KEY:'test'});
 const handler=createMatchHandler(new MatchService(new MemoryRepository(),testers),async()=>A,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,analysis);
 async function request(path:string,token=true,body?:unknown){
  const req=Object.assign(Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]),{url:path,method:body?'POST':'GET',headers:{host:'localhost',...(token?{authorization:'Bearer test'}:{}),'content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'}});
  let status=0,value:any;const res={writeHead(code:number){status=code;return this},end(text:string){value=JSON.parse(text);return this}};
  await handler(req as any,res as any);return {status,value};
 }
 assert.equal((await request('/api/multiplayer/game-analysis/access',false)).status,401);
 assert.deepEqual((await request('/api/multiplayer/game-analysis/access')).value,{premium:false,available:true});
 const denied=await request('/api/multiplayer/game-analysis',true,{gameId:locked.r.gameId,mode:'solo'});assert.equal(denied.status,403);assert.equal(denied.value.error.code,'premium_required');
});


test('saved analyses survive a new service, model changes and provider unavailability',async()=>{
 const db=client(),input={gameId:db.r.gameId,mode:'solo'};let calls=0;
 const generate=async()=>{calls++;return report};
 const first=await new GameAnalysisService(db as any,{OPENAI_API_KEY:'test'},generate).analyze(A,input);
 db.r.events=[]; // Later telemetry must not cause a new report.
 const reopened=await new GameAnalysisService(db as any,{GAME_ANALYSIS_MODEL:'different'},generate).analyze(A,input);
 assert.deepEqual(reopened,first);assert.equal(calls,1);assert.equal(db.reports.size,1);
});

test('two server instances share the database claim and preserve viewer-specific reports',async()=>{
 const db=client(),input={gameId:db.r.gameId,mode:'friends'};let finish!:(value:typeof report)=>void,calls=0;
 const first=new GameAnalysisService(db as any,{OPENAI_API_KEY:'test'},async()=>{calls++;return new Promise(resolve=>{finish=resolve})});
 const second=new GameAnalysisService(db as any,{OPENAI_API_KEY:'test'},async()=>{calls++;return report});
 const pending=first.analyze(A,input);
 while(!finish)await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(second.analyze(A,input),e=>(e as any).code==='analysis_pending');assert.equal(calls,1);
 finish(report);const saved=await pending;assert.deepEqual(await second.analyze(A,input),saved);assert.equal(calls,1);
 await second.analyze(B,input);assert.equal(calls,2);assert.equal(db.reports.size,2);
});

test('save failures are not reported as success and failed attempts can be retried',async()=>{
 const db=client(),input={gameId:db.r.gameId,mode:'solo'},service=new GameAnalysisService(db as any,{OPENAI_API_KEY:'test'},async()=>report);
 db.failSave=true;await assert.rejects(service.analyze(A,input),e=>(e as any).code==='analysis_storage');assert.equal(db.reports.size,0);
 db.failSave=false;assert.deepEqual((await service.analyze(A,input)).report,report);assert.equal(db.reports.size,1);
});


test('structured coaching reports require useful bounded sections and retain legacy compatibility',()=>{
 assert.deepEqual(parseAnalysisReport(coachingReport),coachingReport);
 assert.deepEqual(parseAnalysisReport(report),report);
 for(const invalid of [{...coachingReport,good:[]},{...coachingReport,next:[{title:'Do better',detail:'',action:''}]},{...coachingReport,storyHeadline:'x'.repeat(111)}])assert.throws(()=>parseAnalysisReport(invalid));
});

test('shot charts use exact recorded counts and flip with viewer perspective',()=>{
 const r=record();
 assert.deepEqual(analysisShotStats(analysisFacts([r],'home')),[{type:'drive',you:1,opponents:0}]);
 assert.deepEqual(analysisShotStats(analysisFacts([r],'away')),[{type:'drive',you:0,opponents:1}]);
 assert.deepEqual(analysisShotStats(analysisFacts([],'home')),[]);
});


test('new coaching reports save their exact chart counts alongside the prose',async()=>{
 const db=client(),input={gameId:db.r.gameId,mode:'solo'};
 const result=await new GameAnalysisService(db as any,{OPENAI_API_KEY:'test'},async()=>coachingReport).analyze(A,input);
 assert.deepEqual(result.report,coachingReport);assert.deepEqual(result.shotStats,[{type:'drive',you:1,opponents:0}]);
 const reopened=await new GameAnalysisService(db as any,{},async()=>{throw new Error('Must not regenerate')}).analyze(A,input);
 assert.deepEqual(reopened,result);
});
