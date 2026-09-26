import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {BodyHitReaction,BODY_HIT_REACTION_SECONDS} from '../src/body-hit-reaction';

test('point overlay and countdown wait for the body-hit reaction, including its first frame',()=>{
 const source=readFileSync('src/main.ts','utf8');
 const start=source.indexOf('function syncPointResult(dt:number){');
 const end=source.indexOf('\nlet setupReturnsToCourt',start);
 const elements=new Map<string,any>();
 const byId=(id:string)=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:''});return elements.get(id)};
 let now=0,started=false,hasResult=false;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({hidden:true,setAttribute(){}})}});
 try{
  const reaction=new BodyHitReaction({append(){}} as any);
  const context:any={playerDetailsOpen:()=>false,byId,performance:{now:()=>now*1000},match:{scoring:{winner:null},state:{phase:'complete'},engine:{},replayIndex:null,isLocalHuman:false,playerAutonomy:false},
   scene:{observeBodyHit(){reaction.update(now);if(!started){started=true;reaction.start('you',1.4,now)}},get reactingToHit(){return reaction.active},celebratingAtp:false},
   document:{body:{dataset:{panel:'play'}},hidden:false,querySelector:()=>({classList:{remove(){hasResult=false},toggle(_:string,value:boolean){hasResult=value}}})},
   settingsDialog:{open:false},creator:{dialog:{open:false}},playerDrawer:{open:false},resultEngine:null,resultReadyAt:null,RESULT_DELAY_SECONDS:1.5,resultElapsed:0,resultExpired:false,resultTimer:true,RESULT_WINDOW_SECONDS:10,advancePoint(){throw Error('Advanced before countdown finished')}};
  vm.createContext(context);vm.runInContext(source.slice(start,end).replace('dt:number','dt'),context);
  context.syncPointResult(.1);
  assert.equal(byId('court-result').hidden,true);assert.equal(hasResult,false);assert.equal(context.resultElapsed,0);
  now=BODY_HIT_REACTION_SECONDS-.01;context.syncPointResult(.1);
  assert.equal(byId('court-result').hidden,true);assert.equal(context.resultElapsed,0);
  now=BODY_HIT_REACTION_SECONDS;context.syncPointResult(.1);
  assert.equal(byId('court-result').hidden,true);assert.equal(context.resultElapsed,0);
  now+=1.49;context.syncPointResult(.1);
  assert.equal(byId('court-result').hidden,true);assert.equal(context.resultElapsed,0);
  now+=.02;context.syncPointResult(.1);
  assert.equal(byId('court-result').hidden,false);assert.equal(hasResult,true);assert.equal(context.resultElapsed,.1);
  // A normal point also gets a fresh delay, independent of playback speed.
  context.match.engine={};now=10;context.syncPointResult(.3);
  assert.equal(byId('court-result').hidden,true);assert.equal(context.resultElapsed,0);
  now=11.49;context.syncPointResult(.3);assert.equal(byId('court-result').hidden,true);
  now=11.5;context.syncPointResult(.1);assert.equal(byId('court-result').hidden,false);assert.equal(context.resultElapsed,.1);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
