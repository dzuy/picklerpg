import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {COURT} from '../src/engine/model';
import {parseShotIntent} from '../src/engine/shot-intent';
import {executeShot} from '../src/engine/execution';
import {ShotLab,labSetup} from '../src/shot-lab';

test('exact court targets preserve sideline coordinates and pass through execution',()=>{
 const match=new Match();match.startPractice('middle');
 const point={x:COURT.width/2,z:-5.123};
 const shot=match.targetShot('drive',point);
 assert.deepEqual(shot.aimPoint,{...point,y:.037});
 assert.equal(match.state.phase,'decision');
 assert.deepEqual(parseShotIntent(shot.intent).target,{kind:'point',...point});
 match.playTargetShot('drive',point);
 assert.equal(match.state.phase,'flight');assert.deepEqual(match.shot.aimPoint,shot.aimPoint);
 assert.deepEqual(match.shot.intent.target,{kind:'point',...point});
});
test('target selection rejects own court, invalid coordinates and incompatible contacts',()=>{
 const match=new Match();assert.throws(()=>match.targetShot('drive',{x:0,z:-3}),/serve/);
 match.startPractice('middle');
 for(const point of [{x:0,z:3},{x:0,z:0},{x:NaN,z:-2},{x:4,z:-2}])assert.throws(()=>match.targetShot('drive',point));
 assert.throws(()=>match.targetShot('volley',{x:0,z:-3}),/before its bounce/);
 match.playTargetShot('drop',{x:.42,z:-1.2});assert.throws(()=>match.targetShot('drop',{x:0,z:-2}),/contact/);
});
test('higher shot skill reduces average error around the same exact target',()=>{
 const lab=new ShotLab(),context=labSetup('drive').context;
 const intent={...lab.shot.intent,target:{kind:'point' as const,x:.37,z:-5.17}};
 const average=(skill:number)=>{lab.state.players[0].skills.drive=skill;let sum=0;for(let seed=0;seed<400;seed++){const shot=executeShot(intent,context,lab.state.players,{seed,balance:1});assert.deepEqual(shot.intended.aimPoint,{x:.37,y:.037,z:-5.17});sum+=shot.endpointError}return sum/400};
 assert.ok(average(95)<average(40)*.5);
});
test('an exact target survives the reception branch and executes at the next contact',()=>{
 const match=new Match();let chosen:'drive'|'drop'|'dink'|'volley'|null=null;
 const point={x:.57,z:-3.87};
 for(let frame=0;frame<5000&&!chosen;frame++){
  if(match.receptionDecision){
   for(const type of ['drive','drop','dink','volley'] as const){try{match.targetShot(type,point);chosen=type;break}catch{}}
   if(chosen)break;
   match.chooseReception(match.canLetBounce?'bounce':'air');
  }
  if(match.state.phase==='decision')match.submitIntent(match.availableIntents[0]);
  match.update(.05);if(match.state.phase==='complete'&&!match.scoring.winner)match.nextPoint();
 }
 assert.ok(chosen);match.playTargetShot(chosen,point);
 for(let frame=0;frame<2000&&!match.state.shotHistory.some(intent=>intent.target.kind==='point');frame++)match.update(.02);
 const intent=match.state.shotHistory.find(intent=>intent.target.kind==='point');
 assert.ok(intent);assert.equal(intent.type,chosen);assert.deepEqual(intent.target,{kind:'point',...point});
});
test('serve targeting preserves exact aim, uses serve skill and starts normal playback',()=>{
 const match=new Match(),side=Math.sign(match.shot.contact.x);
 const point={x:-side*1.17,z:-4.91};
 const hitter=match.state.players.find(p=>p.id===match.state.currentHitter)!;
 hitter.skills.serve=91;hitter.skills.drive=20;
 const shot=match.targetShot('serve',point);
 assert.equal(shot.intent.type,'serve');assert.equal(shot.feedback!.skill,91);
 assert.deepEqual(shot.aimPoint,{...point,y:.037});assert.equal(match.state.phase,'decision');
 match.playTargetShot('serve',point);
 assert.equal(match.state.phase,'flight');assert.deepEqual(match.shot.intent.target,{kind:'point',...point});
 if(match.shot.resolution!.receiver){const receiver=match.state.players.find(p=>p.id===match.shot.resolution!.receiver)!;assert.ok(receiver.position.x*match.shot.contact.x<0);assert.equal(match.shot.resolution!.bounced,true)}
});
test('serve targets allow the wrong service box and kitchen but cannot be used mid-rally',()=>{
 const match=new Match(),side=Math.sign(match.shot.contact.x);
 for(const point of [{x:side,z:-5},{x:-side,z:-1},{x:-side,z:-COURT.kitchen},{x:0,z:-5}])assert.deepEqual(match.targetShot('serve',point).aimPoint,{...point,y:.037});
 match.startPractice('middle');assert.throws(()=>match.targetShot('serve',{x:-side,z:-5}),/serve only starts/);
});
test('targeted overhead uses the airborne branch even when no bounced reception exists',()=>{
 const match=new Match();match.seed=1;match.reset();let found=false;
 for(let frame=0;frame<10000&&!found;frame++){
  if(match.receptionDecision){
   const overhead=match.receptionOptions.find(option=>option.timing==='air'&&option.intent.type==='overhead');
   if(overhead){found=true;break}
   match.chooseReception(match.canLetBounce?'bounce':'air');
  }
  if(match.state.phase==='decision')match.submitIntent(match.availableIntents[(frame+1)%match.availableIntents.length]);
  match.update(.2);if(match.state.phase==='complete')match.nextPoint();
 }
 assert.ok(found);delete match.shot.receptionChoice!.bounced;
 const point={x:.8,z:-4},bounces=match.state.bounces;
 const preview=match.targetShot('overhead',point);
 assert.equal(preview.intent.shape,'descending');assert.equal(preview.intent.tacticalIntent,'finish');
 assert.deepEqual(preview.aimPoint,{...point,y:.037});
 const historyLength=match.state.shotHistory.length;
 match.playTargetShot('overhead',point);
 for(let frame=0;frame<1000&&match.state.shotHistory.length===historyLength;frame++)match.update(.02);
 assert.equal(match.state.shotHistory.at(-1)?.type,'overhead');assert.equal(match.state.bounces,bounces);
 assert.deepEqual(match.state.shotHistory.at(-1)?.target,{kind:'point',...point});
});
test('expanded targeting supports counter, block, reset and lob with family-specific intent',()=>{
 const match=new Match();match.startPractice('counter');
 for(const type of ['counter','block','reset','lob'] as const){
  const shot=match.targetShot(type,{x:.5,z:-3.5});assert.equal(shot.intent.type,type);
  const hitter=match.state.players.find(p=>p.id===shot.actor)!;
  assert.equal(shot.feedback!.skill,hitter.skills[type==='lob'?'drop':type==='block'?'volley':type]);
 }
 assert.equal(match.targetShot('lob',{x:.5,z:-5}).intent.shape,'arc');
});
test('flick is an airborne topspin attack using both volley and hands skills',()=>{
 const match=new Match();match.startPractice('counter');
 const hitter=match.state.players.find(p=>p.id===match.state.currentHitter)!;
 hitter.skills.volley=90;hitter.skills.hands=45;
 const point={x:.6,z:-3.1},shot=match.targetShot('flick',point);
 assert.equal(shot.intent.type,'flick');assert.equal(shot.intent.spin?.vertical,'topspin');assert.equal(shot.feedback!.skill,45);
 assert.deepEqual(shot.aimPoint,{...point,y:.037});
 match.playTargetShot('flick',point);assert.equal(match.state.phase,'flight');
 match.startPractice('middle');assert.throws(()=>match.targetShot('flick',point),/before its bounce/);
});
test('targeted serve styles change spin and flight while preserving the tapped destination',()=>{
 const match=new Match(),point={x:-Math.sign(match.shot.contact.x)*1.2,z:-3};
 const styles=['flat','topspin','slice','lob','shallow'] as const;
 for(const style of styles){const shot=match.targetShot('serve',point,style);assert.deepEqual(shot.aimPoint,{...point,y:.037});assert.equal(shot.intent.type,'serve')}
 assert.equal(match.targetShot('serve',point,'topspin').intent.spin?.vertical,'topspin');
 assert.equal(match.targetShot('serve',point,'slice').intent.spin?.vertical,'slice');
 assert.equal(match.targetShot('serve',point,'lob').intent.intendedNetClearance,2.5);
 assert.equal(match.targetShot('serve',point,'shallow').intent.pace,'soft');
 match.playTargetShot('serve',point,'topspin');assert.equal(match.state.phase,'flight');assert.equal(match.shot.intent.spin?.vertical,'topspin');
 const other=new Match();for(const style of styles)assert.deepEqual(other.targetShot('serve',{x:point.x,z:-1},style).aimPoint,{x:point.x,z:-1,y:.037});
});
test('wheel targeting uses the dock menu and preserves its serve flight settings',()=>{
 const match=new Match(),point={x:-Math.sign(match.shot.contact.x)*1.2,z:-4};
 assert.deepEqual(match.targetingMenu.map(o=>o.intent),match.availableIntents);
 const choice=match.targetingMenu.find(o=>o.intent.spin?.vertical==='slice')!;
 const shot=match.previewMenuTarget(choice,point);
 assert.deepEqual(shot.intent,{...choice.intent,target:{kind:'point',...point}});
 match.playMenuTarget(choice,point);assert.equal(match.state.phase,'flight');
 assert.throws(()=>match.playMenuTarget(choice,point),/no longer available/);
});
test('wheel menu shares the dock reception choices and excludes unavailable families',()=>{
 const match=new Match();match.startPractice('middle');
 assert.deepEqual([...new Set(match.targetingMenu.map(o=>o.intent.type))], [...new Set(match.availableIntents.map(o=>o.type))]);
 assert.ok(!match.targetingMenu.some(o=>o.intent.type==='overhead'||o.intent.type==='volley'));
 for(let frame=0;frame<5000;frame++){
  if(match.receptionDecision)break;
  if(match.state.phase==='decision')match.submitIntent(match.availableIntents[0]);
  match.update(.05);if(match.state.phase==='complete')match.nextPoint();
 }
 assert.equal(match.receptionDecision,true);assert.deepEqual(match.targetingMenu,match.displayedReceptionOptions);
 const choice=match.targetingMenu[0],point={x:.7,z:-3};
 const shot=match.previewMenuTarget(choice,point);
 assert.deepEqual(shot.intent,{...choice.intent,target:{kind:'point',...point}});
 const length=match.state.shotHistory.length;match.playMenuTarget(choice,point);
 for(let frame=0;frame<1000&&match.state.shotHistory.length===length;frame++)match.update(.02);
 assert.deepEqual(match.state.shotHistory.at(-1)?.target,{kind:'point',...point});
});

test('serve wheel accepts kitchen, same-side and out-of-bounds landing targets',()=>{
 for(const point of [{x:1,z:-4},{x:-1,z:-1},{x:4,z:-8}]){
  const match=new Match(),choice=match.targetingMenu.find(o=>o.intent.target.kind==='zone')!;
  assert.deepEqual(match.previewMenuTarget(choice,point).aimPoint,{...point,y:.037});
  match.playMenuTarget(choice,point);assert.equal(match.state.phase,'flight');
  assert.equal(match.shot.resolution?.result?.winner,'away');
 }
});
test('serve wheel body option targets the tapped opponent, including the non-receiver',()=>{
 for(const id of ['opponent-left','opponent-right'] as const){
  const match=new Match(),player=match.state.players.find(p=>p.id===id)!;
  const choice=match.targetingMenu.find(o=>o.intent.pace==='fast')!;
  assert.equal(match.previewMenuTarget(choice,{x:0,z:-4}).intent.target.kind,'point');
  match.playMenuTarget(choice,{x:player.position.x,z:player.position.z,playerId:id});
  assert.deepEqual(match.shot.intent.target,{kind:'player',playerId:id,aim:'body'});
  assert.equal(match.state.phase,'flight');
 }
});
