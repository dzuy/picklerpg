import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
test('created players remain on the team despite legacy exclusions, and leave only when deleted',async()=>{
 const result=await build({entryPoints:['src/roster-membership.ts'],bundle:true,write:false,format:'iife',globalName:'Roster',plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path.includes('auth-session')?'export const authClient=()=>globalThis.client;':path.includes('skill-budget')?'export const normalizeSkillBudget=skills=>skills;':path.includes('player-looks')?'export const LOOKS=[];':path.includes('browser-storage')?'export const browserStorage=globalThis.storage;':'export const newPlayer=id=>({id});'}));
 }}]});
 const metadata:any={roster_owned_excluded:['created']},values=new Map<string,string>([['pickle-roster-owned-excluded-v1:owner','["other"]']]);
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'owner',user_metadata:metadata}}}})}};
 const context:any=vm.createContext({client,storage:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
 const players=[{id:'created',name:'My player'},{id:'other',name:'Other player'}];
 const teamIds=()=>Array.from(context.Roster.ownedRosterPlayers(players),(p:any)=>p.id);
 vm.runInContext(result.outputFiles[0].text,context);await context.Roster.loadRosterStarters();
 assert.deepEqual(teamIds(),['created','other']);
 // Reload using the old browser cache without remote exclusions.
 delete metadata.roster_owned_excluded;
 vm.runInContext(result.outputFiles[0].text,context);await context.Roster.loadRosterStarters();
 assert.deepEqual(teamIds(),['created','other']);
 players.push({id:'new',name:'New player'});
 assert.deepEqual(teamIds(),['created','other','new']);
 players.splice(0,1);
 assert.deepEqual(teamIds(),['other','new']);
 assert.equal(context.Roster.setOwnedPlayerAdded,undefined);
});
