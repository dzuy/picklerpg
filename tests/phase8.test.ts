import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {athletePose,shotAge} from '../src/athlete-motion';
import {ballDisplayScale,bouncePulse,cameraBlend} from '../src/scene-readability';
function setup(){const m=new Match();return {player:structuredClone(m.state.players[0]),state:m.snapshot(),shot:structuredClone(m.shot)}}
test('swing selection distinguishes serve, forehand, backhand, soft and overhead',()=>{
 const {player,state,shot}=setup();
 assert.equal(athletePose(player,state,shot).style,'serve');
 shot.intent.type='drive';shot.contact.x=player.position.x+.4;
 assert.equal(athletePose(player,state,shot).style,'forehand');
 player.handedness='left';assert.equal(athletePose(player,state,shot).style,'backhand');
 shot.intent.type='dink';assert.equal(athletePose(player,state,shot).style,'soft');
 shot.intent.type='overhead';assert.equal(athletePose(player,state,shot).style,'overhead');
});
test('bounce boundaries do not restart the swing and late flight settles into ready pose',()=>{
 const {player,state,shot}=setup();state.phase='flight';state.legIndex=1;state.elapsed=.01;
 assert.equal(shotAge(state,shot),shot.legs[0].duration+.01);
 state.elapsed=2;assert.equal(athletePose(player,state,shot).armX,.2);
 const before=structuredClone(state);athletePose(player,state,shot);assert.deepEqual(state,before);
});
test('reaction poses use contact feedback and point results',()=>{
 const {player,state,shot}=setup();shot.intent.type='drive';shot.feedback={skill:50,quality:.4,difficulty:['Stretched contact'],deviation:.2,mishit:false};
 assert.equal(athletePose(player,state,shot).reaction,'Stretched');
 shot.feedback.difficulty=['Moving backward'];assert.equal(athletePose(player,state,shot).reaction,'Late');
 shot.feedback.difficulty=[];shot.intent.type='block';shot.contact={...player.position,y:1};assert.equal(athletePose(player,state,shot).reaction,'Jammed');
 shot.intent.type='drop';shot.legs[0].arc=2;assert.equal(athletePose(player,state,shot).reaction,'Pop-up');
 state.phase='complete';state.result={winner:player.team,reason:'winner'};assert.equal(athletePose(player,state,shot).celebrate,true);
});
test('paused poses are stable and ball size remains bounded',()=>{
 const {player,state,shot}=setup();state.paused=true;
 assert.deepEqual(athletePose(player,state,shot,3,true),athletePose(player,state,shot,3,true));
 assert.equal(ballDisplayScale(1,800,38,1),.037/.092);
 assert.equal(ballDisplayScale(500,300,38,1),1.6);
 assert.ok(ballDisplayScale(35,500,38,1)>ballDisplayScale(10,500,38,1));
});
test('bounce cues expire and camera smoothing is independent of frame rate',()=>{
 assert.equal(bouncePulse(-.1),null);assert.equal(bouncePulse(.5),null);assert.ok(bouncePulse(.2)!.radius>bouncePulse(0)!.radius);
 assert.equal(cameraBlend(.016,true),0);assert.equal(cameraBlend(0,false),0);
 const at60=1-(1-cameraBlend(1/60,false))**60,at30=1-(1-cameraBlend(1/30,false))**30;
 assert.ok(Math.abs(at60-at30)<1e-10);
});
