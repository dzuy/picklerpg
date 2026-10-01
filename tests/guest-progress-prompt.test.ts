import test from 'node:test';
import assert from 'node:assert/strict';
import {GuestProgressPrompt,canPromptForProgress,completedPointsForPrompt,type GuestProgressMoment} from '../src/guest-progress-prompt';
const eligible:GuestProgressMoment={ios:true,guest:true,owner:'guest-a',completedPoints:3,safe:true,finished:false};
function storage(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};}

test('three completed points uses point boundaries, including side-out points without a score change',()=>{
 assert.equal(completedPointsForPrompt('solo',2,false),2);
 assert.equal(completedPointsForPrompt('solo',2,true),3);
 assert.equal(completedPointsForPrompt('friends',3),3);
 assert.equal(canPromptForProgress({...eligible,completedPoints:2}),false);
 assert.equal(canPromptForProgress(eligible),true);
});
test('only iOS guests at a safe pause qualify; signed-in, unavailable, hidden/busy/dialog and finished states defer',()=>{
 for(const change of [{ios:false},{guest:false},{owner:null},{safe:false},{finished:true}])assert.equal(canPromptForProgress({...eligible,...change}),false);
});
test('Not now offers only once across games, controllers and restarts, without changing another guest identity',async()=>{
 const saved=storage();let offers=0;
 const open=async(canOpen:()=>boolean,onShown:()=>void)=>{assert.equal(canOpen(),true);onShown();offers++;return false;};
 const prompt=new GuestProgressPrompt(saved);
 await prompt.offer(()=>eligible,open);
 await prompt.offer(()=>({...eligible,completedPoints:8}),open);
 await new GuestProgressPrompt(saved).offer(()=>eligible,open);
 assert.equal(offers,1);assert.equal(prompt.active,false);
 await new GuestProgressPrompt(saved).offer(()=>({...eligible,owner:'guest-b'}),open);
 assert.equal(offers,2);
});
test('concurrent frame updates cannot open two account dialogs and automatic play stays paused until close',async()=>{
 const prompt=new GuestProgressPrompt(storage());let close!:()=>void,offers=0;
 const pending=prompt.offer(()=>eligible,async(canOpen,onShown)=>{assert.ok(canOpen());onShown();offers++;await new Promise<void>(resolve=>{close=resolve;});});
 assert.equal(prompt.active,true);
 await prompt.offer(()=>eligible,async()=>{offers++;});
 assert.equal(offers,1);close();await pending;assert.equal(prompt.active,false);
});
test('rechecks the moment after async authentication so a shot, another modal, game end or account switch cannot overlap',async()=>{
 for(const change of [{safe:false},{finished:true},{guest:false},{owner:'guest-b'}]){
  const prompt=new GuestProgressPrompt(storage());let current={...eligible},offers=0;
  await prompt.offer(()=>current,async(canOpen,onShown)=>{current={...current,...change};assert.equal(canOpen(),false);});
  current={...eligible};
  await prompt.offer(()=>current,async(canOpen,onShown)=>{assert.ok(canOpen());onShown();offers++;});
  assert.equal(offers,1);
 }
});
test('failed account access does not nag every frame or reset guest progress',async()=>{
 const prompt=new GuestProgressPrompt(storage());let errors=0;
 await prompt.offer(()=>eligible,async()=>{throw Error('offline');},()=>{errors++;});
 await prompt.offer(()=>eligible,async()=>assert.fail('must not repeat automatically'));
 assert.equal(errors,1);assert.equal(prompt.active,false);
});
