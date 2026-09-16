import test from 'node:test';
import assert from 'node:assert/strict';
import {guestStep,guestTargetArea,guestTargetAllowed} from '../src/multiplayer/guest-onboarding';
import {remoteTargeting} from '../src/multiplayer/targeting';
import {RemoteSession} from '../src/multiplayer/match-session';
import {MatchService} from '../server/multiplayer/service';
import {A,B,testers,creation,action,MemoryRepository} from './helpers/remote';

async function opening(){
 const repo=new MemoryRepository(),service=new MatchService(repo,testers);
 const row=service.prepare(A,creation());row.friend_state='pending';await repo.create(row);
 row.checkpoint=(await service.friendOpening(row.id,A))!;row.friend_state='accepted';row.current_action_user_id=B;
 // Fixed resolution secret keeps real engine transitions reproducible.
 row.resolution_secret='0'.repeat(64);repo.rows.set(row.id,row);
 return {service,state:await service.get(row.id,B)};
}
test('accepted guest learns serve, wait, third shot then finishes, using committed match state',async()=>{
 const {service,state}=await opening();
 assert.equal(state.server,'opponent-left');assert.equal(state.currentTeam,'away');assert.equal(guestStep(state,true),'serve');
 const area=guestTargetArea(state,'serve'),point={x:(area.minX+area.maxX)/2,z:(area.minZ+area.maxZ)/2};
 assert.ok(guestTargetAllowed(state,'serve',point));assert.equal(guestTargetAllowed(state,'serve',{...point,x:-point.x}),false);
 assert.equal(guestTargetAllowed(state,'serve',{...point,z:1}),false);assert.equal(guestTargetAllowed(state,'serve',{...point,playerId:'you'}),false);
 assert.equal(guestStep(state,false),null);assert.equal(guestStep({...state,viewerTeam:'home'},true),null);assert.equal(guestStep({...state,friendState:'pending'},true),null);
 const serve=action(state,state.choices.findIndex(c=>c.intent.pace==='fast'));serve.action.intent.target={kind:'point',...point};
 const served=(await service.act(state.id,B,serve)).state;assert.equal(guestStep(served,true),'wait');
 assert.equal(guestStep(structuredClone(served),true),'wait');
 const returned=(await service.act(state.id,A,action(await service.get(state.id,A)))).state;
 const third=await service.get(returned.id,B);assert.equal(guestStep(third,true),'third');assert.equal(third.display.stage,'third');
 const hit=(await service.act(state.id,B,action(third))).state;assert.equal(guestStep(hit,true),null);
 assert.equal(guestStep({...state,pointIndex:1,version:4},true),null);assert.equal(guestStep({...state,status:'completed'},true),null);
});
test('guest serve targeting keeps the normal options and blocks illegal box/body targets without submitting',async()=>{
 const {state}=await opening();
 const session=new RemoteSession(B,state.id,async()=>({owner:B,token:B}),async()=>{throw Error('No network expected')},{getItem:()=>null,setItem:()=>{},removeItem:()=>{}});
 session.state=state;let submitted=0;session.submit=async()=>{submitted++};
 const source=remoteTargeting(()=>session,()=>{},assert.fail,()=>true,p=>guestTargetAllowed(state,guestStep(state,true),p));
 assert.deepEqual(source.choices,state.choices);
 const a=guestTargetArea(state,'serve'),p={x:(a.minX+a.maxX)/2,z:(a.minZ+a.maxZ)/2};
 assert.throws(()=>source.play(state.choices[0],{...p,x:-p.x}));assert.equal(submitted,0);assert.equal(guestStep(session.state,true),'serve');
 source.play(state.choices[0],p);assert.equal(submitted,1);
 session.pending=action(state);assert.equal(source.enabled,false);assert.equal(guestStep(state,true),'serve');
});
