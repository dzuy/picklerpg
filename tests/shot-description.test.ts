import test from 'node:test';
import assert from 'node:assert/strict';
import {commandIntent} from '../src/engine/custom-command';
import {interpretShot} from '../src/shot-description';
import {MatchService} from '../server/multiplayer/service';
import {Match} from '../src/match';
import {sameShotIntent} from '../src/engine/shot-intent';
import {RemoteSession,type Transport} from '../src/multiplayer/match-session';
import {A,B,C,testers,creation,action,MemoryRepository} from './helpers/remote';
const parsed={shot:'drive',target:'middle',aim:'space',pace:'medium',spin:'slice',spinDirection:'none',spinStrength:'strong'} as const;
const text='extreme slice down the middle',point={x:1,z:-4};

test('free text always uses the LLM, preserves spin strength and rejects failed/malformed responses',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{calls++;const body=JSON.parse(options.body as string);assert.equal(body.command,text);assert.deepEqual(body.options,[{}]);return Response.json(parsed)});
 assert.deepEqual(await interpretShot(text,{selectedTarget:point}),parsed);assert.equal(calls,1);
 t.mock.method(globalThis,'fetch',async()=>new Response('',{status:503}));await assert.rejects(interpretShot(text,{}),/not been played/);
 t.mock.method(globalThis,'fetch',async()=>Response.json({shot:'magic'}));await assert.rejects(interpretShot(text,{}),/Unrecognized/);
});
test('a described attempt outside the menu commits through authoritative physics exactly once',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());
 const input={expectedVersion:s.version,decisionId:s.decisionId,command:text,parsed,point};
 const choice=await service.describe(s.id,A,input);
 assert.equal(choice.intent.type,'serve');assert.equal(choice.intent.spin?.strength,'strong');assert.equal(choice.intent.spin?.vertical,'slice');assert.equal(choice.intent.target.kind,'point');
 assert.ok(!s.choices.some(c=>sameShotIntent(c.intent,choice.intent)));assert.equal(db.receipts.size,0);
 const request={...action(s),action:{kind:'play_shot' as const,...choice}};
 const receipt=await service.act(s.id,A,request);assert.equal(receipt.toVersion,1);
 assert.deepEqual(await service.act(s.id,A,request),receipt);assert.equal(db.receipts.size,1);
 await assert.rejects(service.describe(s.id,A,input),/changed|current|stale|refresh/i);
});
test('preparation rejects wrong user/turn and malformed model output; selected target is retained',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());
 const input={expectedVersion:s.version,decisionId:s.decisionId,command:text,parsed:{...parsed,target:'selected'},point};
 await assert.rejects(service.describe(s.id,B,input),/turn/);await assert.rejects(service.describe(s.id,C,input));
 await assert.rejects(service.describe(s.id,A,{...input,parsed:{...parsed,pace:'impossible'}}));
 const choice=await service.describe(s.id,A,input);assert.deepEqual(choice.intent.target,{kind:'point',...point});assert.equal(db.receipts.size,0);
 const solo=new Match();assert.deepEqual(solo.describedChoice({...parsed,target:'selected'},text,point).intent.target,{kind:'point',...point});
});
test('remote description submits the interpreted attempt, and cancellation/stale responses never submit',async t=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation()),values=new Map<string,string>();
 const request:Transport=async<T>(_token,path,body)=>{return (path.endsWith('/describe-shot')?await service.describe(s.id,A,body):path.endsWith('/actions')?await service.act(s.id,A,body):await service.get(s.id,A)) as T;};
 const client=new RemoteSession(A,s.id,async()=>({owner:A,token:'test'}),request,{getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)}});await client.refresh();
 let resolve!:(value:Response)=>void;
 t.mock.method(globalThis,'fetch',()=>new Promise<Response>(r=>{resolve=r}));
 const controller=new AbortController(),cancelled=client.describe(text,point,controller.signal);controller.abort();resolve(Response.json(parsed));await assert.rejects(cancelled);assert.equal(db.receipts.size,0);
 const stale=client.describe(text,point,new AbortController().signal);client.state={...client.state!,version:99};resolve(Response.json(parsed));await assert.rejects(stale,/decision changed/);assert.equal(db.receipts.size,0);
 client.state=s;t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{const {context}=JSON.parse(options.body as string);assert.equal(context.actingTeam,s.viewerTeam);assert.deepEqual(context.roster,s.display.players.map(p=>({id:p.id,name:s.roster[p.id].name,team:p.team})));return Response.json(parsed)});await client.describe(text,point,new AbortController().signal);assert.equal(db.receipts.size,1);assert.equal(client.pending,null);
});

test('cancelling while credentials refresh prevents the described shot commit',async t=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers),s=await service.create(A,creation());
 let pause=false,release!:()=>void,started!:()=>void;const waiting=new Promise<void>(resolve=>{started=resolve});
 const credentials=async()=>{if(pause){started();await new Promise<void>(resolve=>{release=resolve})}return {owner:A,token:'test'}};
 const request:Transport=async<T>(_token,path,body)=>{if(path.endsWith('/describe-shot')){const choice=await service.describe(s.id,A,body);pause=true;return choice as T;}if(body)throw Error('Unexpected commit');return s as T;};
 const client=new RemoteSession(A,s.id,credentials,request,{getItem:()=>null,setItem(){},removeItem(){}});await client.refresh();
 t.mock.method(globalThis,'fetch',async()=>Response.json(parsed));const controller=new AbortController(),submission=client.describe(text,point,controller.signal);await waiting;controller.abort();release();await assert.rejects(submission);assert.equal(client.pending,null);assert.equal(db.receipts.size,0);
});


test('roster slots target the named opponent lane or body from either court side',()=>{
 const m=new Match();m.startPractice('wide');
 const players=structuredClone(m.state.players),context=m.selectionContexts[0].context;
 for(const actor of ['you','opponent-left'] as const){
  const target=actor==='you'?'opponent-right':'partner';
  const opponent=players.find(p=>p.id===target)!;opponent.position.x=.8;
  const contact={...context,contact:{x:-1,y:1,z:actor==='you'?4:-4}};
  const deep=commandIntent({...parsed,target,aim:'behind'},actor,contact,players).intent;
  assert.deepEqual(deep.target,{kind:'point',x:.8,z:actor==='you'?-5.6:5.6});
  const body=commandIntent({...parsed,target,aim:'body',pace:'fast'},actor,contact,players).intent;
  assert.deepEqual(body.target,{kind:'player',playerId:target,aim:'body'});assert.equal(body.pace,'fast');
  assert.throws(()=>commandIntent({...parsed,target:actor},actor,contact,players),/opponent/);
 }
});

test('sideline language resolves to court edge and follows opponent movement on either team',()=>{
 const m=new Match();m.startPractice('wide');
 const players=structuredClone(m.state.players),context=m.selectionContexts[0].context;
 for(const actor of ['you','opponent-left'] as const){
  const target=actor==='you'?'opponent-right':'partner';
  for(const x of [-.4,.4]){
   players.find(p=>p.id===target)!.position.x=x;
   const contact={...context,contact:{x:-.5,y:1,z:actor==='you'?4:-4}};
   const intent=commandIntent({...parsed,target,aim:'sideline'},actor,contact,players).intent;
   assert.deepEqual(intent.target,{kind:'point',x:Math.sign(x)*(20*.3048/2-.25),z:actor==='you'?-5.6:5.6});
   assert.equal(intent.pace,'medium');
   const plain=commandIntent({...parsed,target:'line',aim:'sideline'},actor,contact,players).intent;
   assert.equal(plain.target.kind,'point');if(plain.target.kind==='point')assert.ok(plain.target.x<-2.7);
   const middle=commandIntent({...parsed,target:'middle',aim:'space'},actor,contact,players).intent;
   assert.deepEqual(middle.target,{kind:'zone',zone:'middle',depth:'deep'});
  }
 }
});

test('a custom overhead from a low bounced contact commits an attempt rather than rejecting',()=>{
 const m=new Match();m.startPractice('wide');
 const choice=m.describedChoice({...parsed,shot:'overhead'},'overhead smash',point);
 m.playDescribedChoice(choice,'overhead smash');
 assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.type,'overhead');
 assert.ok(m.shot.feedback?.difficulty.some(d=>d.startsWith('Difficult technique:')));
});

test('remote custom awkward technique passes authoritative commit and consumes one turn',async()=>{
 const db=new MemoryRepository(),service=new MatchService(db,testers);let game=await service.create(A,creation());
 for(let turn=0;turn<30;turn++){
  const owner=game.accountIds![game.currentTeam!]!;game=await service.get(game.id,owner);
  if(game.display.bounces>=2&&!game.serving){
   const choice=await service.describe(game.id,owner,{expectedVersion:game.version,decisionId:game.decisionId,command:'overhead smash after the bounce',parsed:{...parsed,shot:'overhead'},point});
   const receipt=await service.act(game.id,owner,{...action(game),action:{kind:'play_shot',...choice}});
   assert.equal(receipt.toVersion,game.version+1);return;
  }
  game=(await service.act(game.id,owner,action(game))).state;
 }
 assert.fail('No rally contact found');
});
