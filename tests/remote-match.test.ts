import test from 'node:test';
import assert from 'node:assert/strict';
import {MatchService} from '../server/multiplayer/service';
import {parseAction,requestHash} from '../server/multiplayer/validation';
import {A,B,C,testers,creation,action,MemoryRepository} from './helpers/remote';

test('remote full game commits once per action, advances points, restores after service restart and redacts every response',async()=>{
 const db=new MemoryRepository();let service=new MatchService(db,testers),s=await service.create(A,creation()),sameOwner=false;
 db.rows.get(s.id)!.resolution_secret='7'.repeat(64);
 for(let i=0;i<600&&s.status!=='completed';i++){
  const actor=s.currentTeam==='home'?A:B;s=await service.get(s.id,actor);assert.ok(s.choices.length);
  const priorSeed=db.rows.get(s.id)!.checkpoint.seed;
  const before=s,request=action(s,i);const r=await service.act(s.id,actor,request);s=r.state;
  assert.equal(r.toVersion,r.fromVersion+1);assert.equal(s.version,before.version+1);assert.equal(db.receipts.size,i+1);
  if(i>0)assert.notEqual(db.rows.get(s.id)!.checkpoint.seed,priorSeed,'each new decision, including reception, derives a fresh seed');
  if(s.result&&s.currentTeam===before.currentTeam)sameOwner=true;
  assert.equal(s.display.result!==null,s.status==='completed');
  const retry=await service.act(s.id,actor,JSON.parse(JSON.stringify(request)));assert.deepEqual(retry,r);
  for(const value of [s,retry,await service.get(s.id,actor===A?B:A)]){
   const raw=JSON.stringify(value);for(const key of ['resolution_secret','seed','options','receptionChoice','resolution','feedback','solo','checkpoint'])assert.ok(!raw.includes(`"${key}"`),key);
  }
  service=new MatchService(db,testers);
 }
 assert.equal(s.status,'completed');assert.equal(s.currentTeam,null);assert.equal(Math.max(s.score.home,s.score.away),3);assert.ok(sameOwner,'point endings can retain the same action owner');
 const row=db.rows.get(s.id)!;assert.equal(row.checkpoint.scoring.winner,s.score.home>s.score.away?'home':'away');
});
test('ownership, illegal targets, forgery, pinned versions and creation retries',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),input=creation();const s=await service.create(A,input);assert.deepEqual(await service.create(A,input),s);
 await assert.rejects(service.create(A,{...input,scoring:'side-out-doubles'}));await assert.rejects(service.get(s.id,C));
 const a=action(s);await assert.rejects(service.act(s.id,B,a));
 for(const request of [{...a,score:{home:3,away:0}},{...a,action:{...a.action,intent:{...a.action.intent,actor:'partner'}}},{...a,action:{...a.action,intent:{...a.action.intent,target:{kind:'point',x:1,z:3}}}},{...a,action:{...a.action,intent:{...a.action.intent,seed:123}}}])await assert.rejects(service.act(s.id,A,request));
 assert.equal(db.receipts.size,0);db.rows.get(s.id)!.engine_version='future';await assert.rejects(service.act(s.id,A,a),/supported engine/);assert.equal(db.receipts.size,0);
});
test('racing distinct actions yields one winner; identical retries share the original receipt',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());const a=action(s),b=action(s);
 const results=await Promise.allSettled([service.act(s.id,A,a),service.act(s.id,A,b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.receipts.size,1);
 const winner=results[0].status==='fulfilled'?a:b;const [first,second]=await Promise.all([service.act(s.id,A,winner),service.act(s.id,A,winner)]);assert.deepEqual(first,second);
 await assert.rejects(service.act(s.id,A,{...winner,expectedVersion:22}));assert.equal(db.receipts.size,1);
});
test('normalized retry identity ignores input provenance and rejects nonfinite or authority-shaped input',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),s=await service.create(A,creation()),request=action(s,3);
 const normalized=parseAction(request);
 assert.equal(requestHash(normalized),requestHash(parseAction({...request,action:{...request.action,intent:{...request.action.intent,source:'voice'}}})));
 const {spin,...withoutSpin}=request.action.intent;
 assert.equal(requestHash(normalized),requestHash(parseAction({...request,action:{...request.action,intent:withoutSpin}})));
 for(const clearance of [Infinity,NaN,999])assert.throws(()=>parseAction({...request,action:{...request.action,intent:{...request.action.intent,intendedNetClearance:clearance}}}));
 for(const version of [-1,.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>parseAction({...request,expectedVersion:version}));
 assert.throws(()=>parseAction({...request,action:{...request.action,trajectory:[]}}));
});
test('different request IDs cannot reroll the same decision',async()=>{
 const left=new MemoryRepository(),right=new MemoryRepository(),service=new MatchService(left,testers),s=await service.create(A,creation());
 right.rows=structuredClone(left.rows);const another=new MatchService(right,testers);
 const one=await service.act(s.id,A,action(s)),two=await another.act(s.id,A,action(s));assert.deepEqual(one.state,two.state);
});

test('account names label one player on each team for both viewers, including existing matches',async()=>{
 const db=new MemoryRepository(),names=new Map(testers),service=new MatchService(db,names),s=await service.create(A,creation());
 const saved=structuredClone(db.rows.get(s.id)!.checkpoint);
 names.set(A,'Morgan');names.set(B,'Riley');
 for(const actor of [A,B]){
  const viewed=await service.get(s.id,actor),listed=(await service.list(actor))[0];
  for(const game of [viewed,listed]){
   assert.equal(game.roster.you.name,'Morgan');assert.equal(game.roster['opponent-left'].name,'Riley');
   assert.equal(game.roster.partner.name,s.roster.partner.name);assert.equal(game.roster['opponent-right'].name,s.roster['opponent-right'].name);
  }
 }
 assert.deepEqual(db.rows.get(s.id)!.checkpoint,saved,'display names do not change saved gameplay');
});
