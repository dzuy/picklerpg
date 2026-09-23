import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

async function bundle(entry:string){
 const result=await build({entryPoints:[entry],bundle:true,write:false,format:'iife',globalName:'Subject',plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
  b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:
   path.includes('auth-session')?'export const authClient=()=>globalThis.client;':
   path.includes('friend-flow')?'export const createYourPlayer=(...args)=>globalThis.createAccount(...args);':
   path.includes('account-skill-budget')?'export const accountSkillBudget=async()=>35;':
   path.includes('skill-budget')?'export const normalizeSkillBudget=s=>s;':
   'export const validatePlayer=p=>p;'}));
 }}]});return result.outputFiles[0].text;
}

test('signed-out and anonymous roster adds open account creation and remain blocked, including after dismissal',async()=>{
 const code=await bundle('src/roster-account.ts');
 for(const session of [null,{user:{id:'guest',is_anonymous:true}}]){
  let prompts=0,reloads=0;const destinations:string[]=[];let callbacks:any[]=[];
  const context:any=vm.createContext({client:{auth:{getSession:async()=>({data:{session}})}},
   createAccount:async(...args:any[])=>{prompts++;callbacks=args;return false},location:{reload:()=>reloads++,assign:(url:string)=>destinations.push(url)}});
  vm.runInContext(code,context);
  assert.equal(await context.Subject.canAddToRoster(),false);
  assert.equal(await context.Subject.canAddToRoster(),false);
  assert.equal(prompts,2);assert.equal(reloads,0);
  await callbacks[0]();assert.deepEqual(destinations,['/?openplay=1&setup=1']);assert.equal(reloads,0);
  await callbacks[1].onSignIn();assert.equal(reloads,1);
 }
});

test('registered players can add without opening account creation',async()=>{
 const code=await bundle('src/roster-account.ts');
 const context:any=vm.createContext({client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner',is_anonymous:false}}}})}},createAccount:()=>{throw Error('Unexpected modal')}});
 vm.runInContext(code,context);assert.equal(await context.Subject.canAddToRoster(),true);
});

test('community additions never write for signed-out or anonymous sessions',async()=>{
 const code=await bundle('src/community-players.ts');let writes=0;
 for(const session of [null,{user:{id:'guest',is_anonymous:true}},{user:{id:'owner',is_anonymous:false}}]){
  const context:any=vm.createContext({client:{auth:{getSession:async()=>({data:{session}})},from:()=>({insert:async()=>{writes++;return {error:null}}})}});
  vm.runInContext(code,context);
  if(!session||session.user.is_anonymous)await assert.rejects(context.Subject.setCommunityAdded('player',true),/Sign in/);
  else await context.Subject.setCommunityAdded('player',true);
 }
 assert.equal(writes,1);
});

test('guests can remove existing community selections from their own roster',async()=>{
 const code=await bundle('src/community-players.ts');
 for(const session of [null,{user:{id:'guest',is_anonymous:true}},{user:{id:'owner',is_anonymous:false}}]){
  const filters:unknown[]=[];let deletes=0;
  const query={eq:(key:string,value:string)=>{filters.push([key,value]);return query},error:null};
  const context:any=vm.createContext({client:{auth:{getSession:async()=>({data:{session}})},from:(table:string)=>{
   assert.equal(table,'community_player_selections');return {delete:()=>{deletes++;return query}};
  }}});
  vm.runInContext(code,context);
  if(!session){await assert.rejects(context.Subject.setCommunityAdded('bea',false),/Sign in/);assert.equal(deletes,0);}
  else{
   await context.Subject.setCommunityAdded('bea',false);
   assert.equal(deletes,1);assert.deepEqual(filters,[['owner_id',session.user.id],['public_id','bea']]);
  }
 }
});
