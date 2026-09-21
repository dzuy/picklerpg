import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
test('owned roster removal preserves designs, persists across reload, and failed saves do not remove players',async()=>{
 const result=await build({entryPoints:['src/roster-membership.ts'],bundle:true,write:false,format:'iife',globalName:'Roster',plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path.includes('auth-session')?'export const authClient=()=>globalThis.client;':path.includes('skill-budget')?'export const normalizeSkillBudget=skills=>skills;':path.includes('player-looks')?'export const LOOKS=[];':path.includes('browser-storage')?'export const browserStorage=globalThis.storage;':'export const newPlayer=id=>({id});'}));
 }}]});
 const metadata:any={},values=new Map<string,string>();let fail=false;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'owner',user_metadata:metadata}}}}),updateUser:async({data}:any)=>{if(fail)return {error:Error('offline')};Object.assign(metadata,data);return {error:null}}}};
 const context:any=vm.createContext({client,storage:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
 vm.runInContext(result.outputFiles[0].text,context);await context.Roster.loadRosterStarters();
 const players=[{id:'created',name:'My player'},{id:'other',name:'Other player'}];
 await context.Roster.setOwnedPlayerAdded('created',false);
 assert.deepEqual(Array.from(context.Roster.ownedRosterPlayers(players),(p:any)=>p.id),['other']);
 assert.equal(players.length,2);assert.equal(players[0].name,'My player');
 vm.runInContext(result.outputFiles[0].text,context);await context.Roster.loadRosterStarters();
 assert.equal(context.Roster.ownedRosterPlayers(players).length,1);
 await context.Roster.setOwnedPlayerAdded('created',true);assert.equal(context.Roster.ownedRosterPlayers(players).length,2);
 fail=true;await assert.rejects(context.Roster.setOwnedPlayerAdded('created',false),/Could not save/);
 assert.equal(context.Roster.ownedRosterPlayers(players).length,2);
});
