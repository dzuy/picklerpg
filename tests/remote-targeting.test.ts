import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteTargeting} from '../src/multiplayer/targeting';
import {RemoteSession} from '../src/multiplayer/match-session';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,MemoryRepository} from './helpers/remote';
import type {PublicMatch} from '../src/multiplayer/protocol';

test('wheel preserves server shot variants and reception timing across polling refreshes',async()=>{
 const state=await new MatchService(new MemoryRepository(),testers).create(A,creation());
 const session=new RemoteSession(A,state.id,async()=>({owner:A,token:A}),async()=>{throw Error('No network expected')},{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
 session.state=state;let sent:PublicMatch['choices'][number]|undefined,skips=0;
 session.submit=async choice=>{sent=choice};
 const source=remoteTargeting(()=>session,()=>skips++,message=>assert.fail(message));
 const choice={...state.choices[0],timing:'bounce' as const};state.choices=[choice];
 session.state=structuredClone(state); // Same version from a background poll: choice objects are new.
 source.play(choice,{x:1,z:-3});
 assert.deepEqual(sent,{...choice,intent:{...choice.intent,target:{kind:'point',x:1,z:-3}}});assert.equal(skips,1);
 session.busy=true;assert.equal(source.enabled,false);assert.throws(()=>source.play(choice,{x:1,z:-3}));session.busy=false;
 session.state.currentTeam='away';assert.equal(source.enabled,false);assert.throws(()=>source.play(choice,{x:1,z:-3}));
 session.state.currentTeam='home';session.state.choices=[];assert.throws(()=>source.play(choice,{x:1,z:-3}));
});

test('wheel respects away-side coordinates and maps body serves only to opponents',async()=>{
 const service=new MatchService(new MemoryRepository(),testers),game=await service.create(A,creation());
 const state=await service.get(game.id,B);state.currentTeam='away';state.choices=game.choices;
 const session=new RemoteSession(B,state.id,async()=>({owner:B,token:B}),async()=>{throw Error('No network expected')},{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
 session.state=state;let sent:PublicMatch['choices'][number]|undefined;session.submit=async c=>{sent=c};
 const source=remoteTargeting(()=>session,()=>{},message=>assert.fail(message)),choice=state.choices[0];
 assert.throws(()=>source.play(choice,{x:1,z:-3}));source.play(choice,{x:1,z:3});assert.deepEqual(sent?.intent.target,{kind:'point',x:1,z:3});
 source.play(choice,{x:1,z:3,playerId:'you'});assert.deepEqual(sent?.intent.target,{kind:'player',playerId:'you',aim:'body'});
 assert.throws(()=>source.play(choice,{x:1,z:3,playerId:'opponent-left'}));
});
