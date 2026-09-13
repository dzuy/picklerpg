import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RallyEngine, classifyStage} from '../src/engine/rally-engine';
import {COURT, type RallyProvider, type RallyShot, type ShotType, type GameState} from '../src/engine/model';
import {pressureMiddle} from './helpers/pressure-middle';

function advance(engine:RallyEngine){engine.update(100)}
/** Procedurally supplies one contact at a time; deliberately no fixed shot array. */
function exchangeProvider(length:number,winner:'home'|'away'='away'):RallyProvider{
 return {
  setup:()=>pressureMiddle.setup(),
  next(state){
   if(state.shotHistory.length>=length)return {kind:'point-end',result:{winner,reason:'unreturned-attack'}};
   const n=state.shotHistory.length,actor=n%2===0?'you':'opponent-right';
   const type:ShotType=n===1?'return':n===2?'drive':n===3?'block':n===4?'drop':n===5?'dink':n===6?'volley':n===7?'counter':'reset';
   const contact={...state.ball.position},target={x:.5,y:.8,z:actor==='you'?-2.6:2.6};
   const positions=Object.fromEntries(state.players.map(p=>[p.id,{...p.position,z:n<4?p.position.z:p.team==='home'?2.6:-2.6}])) as RallyShot['positions'];
   return {kind:'contact',contact:{options:[{
    aimPoint:target,actor,contact,positions,title:'Exchange',description:'Engine regression contact',cue:'',
    intent:{schemaVersion:1,actor,type,target:{kind:'zone',zone:'middle',depth:'kitchen'},pace:'soft',shape:'arc',intendedNetClearance:.6,tacticalIntent:'sustain',aggression:.2,source:'script'},
    legs:[{from:contact,to:target,duration:.5,arc:.7}],
   }]}};
  }
 };
}

test('unbounded provider reaches opening, transition, kitchen, attack, counter and reset stages',()=>{
 const engine=new RallyEngine(exchangeProvider(13));const stages=new Set([engine.state.stage]);
 for(let frames=0;engine.state.phase!=='complete'&&frames<2000;frames++){
  if(engine.state.phase==='decision')engine.submitIntent(engine.availableIntents[0]);
  engine.update(.1);stages.add(engine.state.stage);
 }
 assert.equal(engine.state.phase,'complete');assert.equal(engine.state.shotHistory.length,13);
 assert.deepEqual([...stages],['serve','return','third','fourth','transition','kitchen-exchange','attack','counter','reset','point-end']);
 assert.deepEqual(engine.state.result,{winner:'away',reason:'unreturned-attack'});
 assert.deepEqual(engine.state.score,{home:0,away:1});
 assert.deepEqual(engine.availableIntents,[]);const terminal=structuredClone(engine.state);engine.update(100);assert.deepEqual(engine.state,terminal);
 engine.reset();assert.equal(engine.state.stage,'serve');assert.equal(engine.state.result,null);assert.equal(engine.state.shotHistory.length,0);
});

test('a point may end after the serve instead of waiting for five shots',()=>{
 const engine=new RallyEngine(exchangeProvider(1,'home'));engine.submitIntent(engine.availableIntents[0]);advance(engine);
 assert.equal(engine.state.shotHistory.length,1);assert.equal(engine.state.phase,'complete');assert.equal(engine.state.score.home,1);
});

test('large time steps stop at the next user contact and update possession/hitter',()=>{
 const engine=new RallyEngine(exchangeProvider(15));engine.submitIntent(engine.availableIntents[0]);advance(engine);
 assert.equal(engine.state.shotHistory.length,2);assert.equal(engine.state.phase,'decision');assert.equal(engine.state.currentHitter,'you');assert.equal(engine.state.possession,'home');assert.equal(engine.state.stage,'third');
 engine.submitIntent(engine.availableIntents[0]);engine.update(1.01);
 assert.equal(engine.state.stage,'transition');assert.equal(engine.state.phase,'decision');assert.equal(engine.state.shotHistory.length,4);
});

test('multiple contact options select distinct execution and provider outcome',()=>{
 const provider:RallyProvider={
  setup(){const setup=pressureMiddle.setup();const safe=setup.contact.options[0];const aggressive=structuredClone(safe);aggressive.intent.pace='fast';aggressive.title='Aggressive serve';aggressive.legs[0].arc=1.8;setup.contact.options.push(aggressive);return setup},
  next(state){return {kind:'point-end',result:{winner:state.shotHistory[0].pace==='fast'?'away':'home',reason:'out'}}},
 };
 const engine=new RallyEngine(provider);assert.equal(engine.availableIntents.length,2);
 engine.submitIntent({...engine.availableIntents[1],source:'voice'});assert.equal(engine.shot.title,'Aggressive serve');assert.equal(engine.shot.legs[0].arc,1.8);advance(engine);assert.equal(engine.state.score.away,1);
 engine.reset();engine.submitIntent(engine.availableIntents[0]);advance(engine);assert.equal(engine.state.score.home,1);
});

test('partner contacts automatically use the same input path',()=>{
 const provider=exchangeProvider(5),originalNext=provider.next;
 provider.next=(state,shot)=>{const outcome=originalNext(state,shot);if(outcome.kind==='contact'&&state.shotHistory.length===2){for(const option of outcome.contact.options){option.actor='partner';option.intent.actor='partner'}}return outcome};
 const engine=new RallyEngine(provider);engine.submitIntent(engine.availableIntents[0]);advance(engine);
 assert.equal(engine.state.shotHistory.length,4);assert.equal(engine.state.shotHistory[2].actor,'partner');assert.equal(engine.state.shotHistory[2].source,'script');assert.equal(engine.state.currentHitter,'you');
});

test('provider receives isolated snapshots and cannot overwrite live state',()=>{
 const provider:RallyProvider={setup:()=>pressureMiddle.setup(),next(state,shot){(state as GameState).score.home=999;shot.legs[0].to.x=999;return {kind:'point-end',result:{winner:'away',reason:'net'}}}};
 const engine=new RallyEngine(provider);engine.submitIntent(engine.availableIntents[0]);advance(engine);assert.deepEqual(engine.state.score,{home:0,away:1});assert.notEqual(engine.shot.legs[0].to.x,999);
});

test('invalid provider legs, discontinuous contacts and consecutive team hits are rejected',()=>{
 const broken=pressureMiddle.setup();broken.contact.options[0].legs[0].duration=0;
 assert.throws(()=>new RallyEngine({setup:()=>broken,next:()=>{throw Error('unused')}}),/flight legs/);
 const provider=exchangeProvider(5),next=provider.next;
 provider.next=(state,shot)=>{const result=next(state,shot);if(result.kind==='contact')result.contact.options[0].contact.x+=1;return result};
 const engine=new RallyEngine(provider);engine.submitIntent(engine.availableIntents[0]);assert.throws(()=>advance(engine),/endpoint/);
 const sameTeam=exchangeProvider(5),sameNext=sameTeam.next;sameTeam.next=(state,shot)=>{const result=sameNext(state,shot);if(result.kind==='contact'){result.contact.options[0].actor='partner';result.contact.options[0].intent.actor='partner'}return result};
 const other=new RallyEngine(sameTeam);other.submitIntent(other.availableIntents[0]);assert.throws(()=>advance(other),/alternate teams/);
});

test('kitchen exchanges can repeat; tactical stages are not a linear script',()=>{
 const setup=pressureMiddle.setup();for(const player of setup.players)player.position.z=player.team==='home'?COURT.kitchen+.3:-COURT.kitchen-.3;
 const dink={...setup.contact.options[0].intent,type:'dink' as const};
 for(const count of [5,6,18,30])assert.equal(classifyStage(count,dink,setup.players),'kitchen-exchange');
 assert.equal(classifyStage(30,{...dink,type:'reset'},setup.players),'reset');assert.equal(classifyStage(31,dink,setup.players),'kitchen-exchange');
});
