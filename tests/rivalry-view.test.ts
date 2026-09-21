import test from 'node:test';
import assert from 'node:assert/strict';
import {rivalryHeadline,seriesLine,rivalryData,rivalryCardStory} from '../src/multiplayer/rivalry-view';
import type {RivalrySummary} from '../src/multiplayer/rivalry';
import {RematchFlow} from '../src/multiplayer/rematch-flow';
import {A,B} from './helpers/remote';
function summary(wins:number,losses:number,won=true,streak=1,previous?:{owner:'you'|'opponent';length:number}):RivalrySummary{return {definitionVersion:1,games:wins+losses,wins,losses,streak:{owner:won?'you':'opponent',length:streak},previousStreak:previous??null,bestStreak:{you:streak,opponent:streak},recent:[{matchId:A,completedAt:'2026-09-18T00:00:00Z',result:won?'win':'loss',score:{you:won?3:1,opponent:won?1:3},rules:{target:3,winBy:1,scoring:'rally-doubles'}}],closest:null as any,milestones:[2,3,5,10,25,100].filter(n=>n<=wins+losses)};}
test('friend cards tell a concise story using the current head-to-head history',()=>{
 const story=(s:RivalrySummary)=>rivalryCardStory({current:s,atCompletion:null});
 assert.equal(story(summary(6,0,true,6)),'You’ve dominated this rivalry 6–0.');
 assert.equal(story(summary(0,6,false,6)),'They lead 6–0. Time for a comeback.');
 assert.equal(story(summary(5,4,false,3)),'They’re on a 3-game win streak against you.');
 assert.equal(story(summary(4,5,true,3)),'You’re on a 3-game win streak against them.');
 assert.match(story(summary(2,2)),/All square at 2–2/);
 assert.match(story(summary(1,0)),/You took the first game/);
 assert.match(story(summary(0,1,false)),/They took the first game/);
 assert.match(story(summary(2,4,false)),/They’re ahead 4–2/);
 assert.equal(rivalryCardStory(undefined),'');
 assert.match(rivalryCardStory({current:null,atCompletion:null}),/starts with the first game/);
});
test('one rivalry headline follows evidence priority and reverses viewpoint',()=>{
 assert.equal(rivalryHeadline(summary(3,3,true,1,{owner:'opponent',length:3}),'Ryan').key,'streak_broken');
 assert.match(rivalryHeadline(summary(3,3,false,1,{owner:'you',length:3}),'Ryan').text,/ended your/);
 assert.equal(rivalryHeadline(summary(4,3),'Ryan').key,'series_lead');
 assert.match(rivalryHeadline(summary(3,4,false),'Ryan').text,/Ryan takes/);
 assert.equal(rivalryHeadline(summary(2,2),'Ryan').key,'series_tied');
 assert.equal(rivalryHeadline(summary(4,1,true,3),'Ryan').key,'streak_extended');
 assert.equal(rivalryHeadline(summary(4,1),'Ryan').key,'milestone');
 assert.equal(rivalryHeadline(summary(1,0),'Ryan').key,'series_record');
 assert.equal(seriesLine(summary(2,4)),'You trail 2–4');
 assert.equal(rivalryData(undefined),undefined);assert.equal(rivalryData({current:{games:200},atCompletion:null}),undefined);
});
test('rematch requests stay pending, ignore double taps, and enter the shared game only after acceptance',async()=>{
 let posts=0,opened='';let state:any={invitationId:null,matchId:null,requesterId:null,status:'none'};
 const flow=new RematchFlow(async()=>({owner:A,token:A}),async(_token,_path,body)=>{if(body){posts++;await new Promise(r=>setTimeout(r,5));state={invitationId:B,matchId:null,requesterId:A,status:'pending'};return state;}return state;},()=>{},async id=>{opened=id;});
 flow.reset(A,A);await Promise.all([flow.submit(),flow.submit()]);assert.equal(posts,1);assert.equal(flow.waiting,true);assert.equal(opened,'');
 await flow.submit();assert.equal(posts,1);state={...state,status:'accepted',matchId:B};await flow.refresh();assert.equal(opened,B);
});
test('old rematches do not auto-open and late replies cannot navigate away from a new screen',async()=>{
 let resolve:any,opened='';const flow=new RematchFlow(async()=>({owner:A,token:A}),async()=>new Promise(r=>{resolve=r;}) as any,()=>{},async id=>{opened=id;});
 flow.reset(A,A);const reading=flow.refresh();await new Promise(r=>setImmediate(r));resolve({invitationId:B,matchId:B,requesterId:A,status:'accepted'});await reading;assert.equal(opened,'');
 const pending=flow.submit();await new Promise(r=>setImmediate(r));flow.reset();resolve({invitationId:B,matchId:B});await pending;assert.equal(opened,'');
});
test('an uncertain rematch request can be retried using the same source',async()=>{
 let calls=0;const paths:string[]=[];
 const flow=new RematchFlow(async()=>({owner:A,token:A}),async(_token,path)=>{paths.push(path);if(++calls===1)throw Error('Network lost');return {invitationId:B,matchId:null} as any;},()=>{},async()=>{});
 flow.reset(A,A);await flow.submit();assert.equal(flow.message,'Network lost');assert.equal(flow.busy,false);await flow.submit();assert.equal(flow.waiting,true);assert.equal(paths[0],paths[1]);
});
