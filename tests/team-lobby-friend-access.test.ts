import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

const bundled=build({entryPoints:['src/multiplayer/team-lobby.ts'],bundle:true,write:false,format:'iife',globalName:'Lobby',plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:
  path.includes('auth-session')?'export const authClient=()=>globalThis.client;export const matchCredentials=async()=>({});':
  path.includes('friend-flow')?'export const createYourPlayer=(...args)=>globalThis.createAccount(...args);':
  path.includes('app-navigation')?'export const initialLobbyPage=()=>"games";export const appNavigation=()=>{};':
  path.includes('rivalry-view')?'export const rivalryProfile=()=>{};export const rivalryCardStory=()=>{};':
  path.includes('avatar-preview')?'export class AvatarThumbnails {}':
  path.includes('athlete')?'export const preloadAthletes=async()=>{};':
  path.includes('community-directory')?'export const canShowCommunityAccount=()=>true;':
  path.includes('profile')?'export const profilePanel=()=>{};':
  path.includes('api')?'export const remoteRequest=async()=>{};':''}));
}}]});

async function fixture(session:unknown,friends:string[]=[]){
 let prompts=0,changes=0;const writes:any[]=[];
 const context:any=vm.createContext({URLSearchParams,location:{search:'',reload:()=>{}},
  client:{auth:{getSession:async()=>({data:{session}}),updateUser:async(value:any)=>{writes.push(value);return {error:null}}}},
  createAccount:async()=>{prompts++;return false}});
 vm.runInContext((await bundled).outputFiles[0].text,context);
 const lobby=Object.create(context.Lobby.TeamLobby.prototype);
 lobby.data={self:{id:'viewer'},teams:[],friends};lobby.actions={changed:()=>changes++};lobby.draw=()=>{};
 return {lobby,writes,get prompts(){return prompts},get changes(){return changes}};
}

test('signed-out and anonymous Add Friend attempts prompt for an account without saving',async()=>{
 for(const session of [null,{user:{id:'viewer',is_anonymous:true}}]){
  const f=await fixture(session);
  assert.equal(await f.lobby.friend('community-user'),false);
  assert.equal(f.prompts,1);assert.equal(f.writes.length,0);assert.equal(f.changes,0);
  assert.deepEqual(f.lobby.data.friends,[]);
  assert.equal(await f.lobby.friend('community-user'),false);assert.equal(f.prompts,2);
 }
});

test('registered players can add and remove friends',async()=>{
 const f=await fixture({user:{id:'viewer',is_anonymous:false}});
 assert.equal(await f.lobby.friend('community-user'),true);
 assert.deepEqual(Array.from(f.lobby.data.friends),['community-user']);
 assert.equal(await f.lobby.friend('community-user'),true);
 assert.equal(f.lobby.data.friends.length,0);assert.equal(f.writes.length,2);assert.equal(f.prompts,0);
});

test('anonymous players can remove a friend saved before account gating',async()=>{
 const f=await fixture({user:{id:'viewer',is_anonymous:true}},['community-user']);
 assert.equal(await f.lobby.friend('community-user'),true);
 assert.equal(f.lobby.data.friends.length,0);assert.equal(f.writes.length,1);assert.equal(f.prompts,0);
 assert.equal(await f.lobby.friend('community-user'),false);
 assert.equal(f.writes.length,1);assert.equal(f.prompts,1);
});
