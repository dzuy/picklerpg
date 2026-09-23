import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {challengeIdentity} from '../src/multiplayer/challenge-identity';

const source=readFileSync('src/multiplayer/friend-landing.ts','utf8');
const block=source.slice(source.indexOf("if(i.status==='pending'||i.status==='accepted'){"),source.indexOf('\n switchPlayer.onclick'));
test('new invitation guests join anonymously and land in Games without account creation',async()=>{
 for(const accepted of [false,true])for(const existing of [false,true]){
  const calls:string[]=[];
  const guest={access_token:'guest-token',user:{id:'guest',is_anonymous:true,user_metadata:{}}};
  const context={
   i:{status:accepted?'accepted':'pending'},accepted,history:{},token:'private-link',invitedName:'Luna',button:{hidden:false},message:{textContent:''},challengeIdentity,
   authClient:()=>({auth:{
    getSession:async()=>({data:{session:existing?guest:null}}),
    signInAnonymously:async()=>{calls.push('guest');return {data:{session:guest}}},
    refreshSession:async()=>{calls.push('refresh');return {}}
   }}),
   join:async(token:string)=>{assert.equal(token,'guest-token');calls.push('join')},
   openChallengeLobby:async()=>{calls.push('games')},
   showIdentity:()=>{throw Error('Unexpected identity or account screen')}
  };
  await vm.runInNewContext('(async()=>{'+block+'})()',context);
  assert.deepEqual(calls,existing?['join','refresh','games']:['guest','join','refresh','games']);
 }
});
