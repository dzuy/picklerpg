import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {assessChoice,assessShot} from '../src/shot-assessment';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,MemoryRepository} from './helpers/remote';
test('risk estimates are repeatable, reflect skill and do not mutate the game',()=>{
 const match=new Match(),before=JSON.stringify(match.state),contact=match.shotAssessmentContexts[0],intent={...match.targetingMenu[0].intent,target:{kind:'point' as const,x:-1,z:-4}};
 const players=(skill:number)=>contact.players.map(p=>({...p,skills:Object.fromEntries(Object.keys(p.skills).map(k=>[k,skill])) as typeof p.skills}));
 const low=assessShot(intent,contact.context,players(10)),high=assessShot(intent,contact.context,players(100));
 const rank={Low:0,Medium:1,High:2};assert.ok(rank[low.risk]>rank[high.risk]);
 assert.deepEqual(assessShot(intent,contact.context,players(100)),high);assert.equal(JSON.stringify(match.state),before);
});
test('pressure reflects defender positioning and selected target',()=>{
 const match=new Match(),c=match.shotAssessmentContexts[0],context={...c.context,opening:'rally' as const,bounced:true,twoBounceSatisfied:true,contact:{x:0,y:1,z:3},feet:{x:0,y:0,z:3}};
 const intent={...match.targetingMenu[0].intent,type:'drive' as const,target:{kind:'point' as const,x:2,z:-4},pace:'medium' as const};
 const defenders=(x:number)=>c.players.map(p=>p.team==='away'?{...p,position:{x,y:0,z:-4}}:p);
 const near=assessShot(intent,context,defenders(2)),far=assessShot(intent,context,defenders(-3));
 const rank={Low:0,Medium:1,High:2};assert.ok(rank[far.pressure]>rank[near.pressure]);
 assert.equal(assessChoice({intent},{x:2,z:-4},[]),undefined);
});
test('only the acting viewer receives safe assessment geometry',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation()),other=await service.get(game.id,B);
 assert.ok(game.assessmentContacts?.length);assert.deepEqual(other.assessmentContacts,[]);
 const raw=JSON.stringify(game.assessmentContacts);for(const name of ['seed','resolution','receptionChoice','options','outcome'])assert.ok(!raw.includes(`"${name}"`));
});

test('comfortable serves distinguish safe, fast and very high lob attempts',()=>{
 const match=new Match(),contact=match.shotAssessmentContexts[0];
 const rate=(intent:typeof match.targetingMenu[number]['intent'])=>assessShot({...intent,target:{kind:'point',x:-1,z:-4}},contact.context,contact.players).risk;
 const safe=match.targetingMenu.find(c=>c.intent.pace==='soft'&&c.intent.intendedNetClearance<1)!;
 const fast=match.targetingMenu.find(c=>c.intent.pace==='fast')!;
 const lob=match.targetingMenu.find(c=>c.intent.intendedNetClearance>=5)!;
 assert.equal(rate(safe.intent),'Low');assert.equal(rate(fast.intent),'Medium');assert.equal(rate(lob.intent),'High');
});

test('short sideline lob and reset are risky even for skilled players',()=>{
 const match=new Match(),c=match.shotAssessmentContexts[0];
 const context={...c.context,opening:'rally' as const,bounced:true,twoBounceSatisfied:true,contact:{x:1,y:.7,z:3},feet:{x:1,y:0,z:3},incomingSpeed:5};
 for(const skill of [70,90,100]){
  const players=c.players.map(p=>({...p,skills:Object.fromEntries(Object.keys(p.skills).map(k=>[k,skill])) as typeof p.skills}));
  for(const type of ['reset','lob'] as const){
   const intent={...match.targetingMenu[0].intent,type,pace:'soft' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'none' as const,strength:'medium' as const},intendedNetClearance:.25};
   assert.equal(assessShot({...intent,target:{kind:'point',x:0,z:-4}},context,players).risk,'Low');
   assert.equal(assessShot({...intent,target:{kind:'point',x:2.85,z:-.4}},context,players).risk,'High');
  }
 }
});
