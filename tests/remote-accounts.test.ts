import test from 'node:test';import assert from 'node:assert/strict';
import {registrationInput,registerPlaytester,loadPlaytesters} from '../server/multiplayer/accounts';
test('playtest registration validates credentials and confirms only a newly created identity',async()=>{
 assert.throws(()=>registrationInput({email:'x@y.com',password:'short'}));assert.throws(()=>registrationInput({email:'x@y.com',password:'long-enough-password',id:'existing'}));
 let request:any;const client:any={auth:{admin:{createUser:async(input:any)=>{request=input;return {data:{user:{id:'new'}},error:null};}}}};
 assert.deepEqual(await registerPlaytester(client,{email:' Test@Example.com ',password:'long-enough-password'}),{created:true});
 assert.equal(request.email,'test@example.com');assert.equal(request.email_confirm,true);assert.deepEqual(request.app_metadata,{multiplayer_playtest:true});
 client.auth.admin.createUser=async()=>({data:{user:null},error:{code:'email_exists'}});
 await assert.rejects(registerPlaytester(client,{email:'test@example.com',password:'long-enough-password'}),/already registered/);
});
test('player directory trusts only admin-owned enrollment metadata',async()=>{
 const client:any={auth:{admin:{listUsers:async()=>({data:{users:[{id:'a',email:'a@example.com',app_metadata:{multiplayer_playtest:true}},{id:'b',email:'b@example.com',user_metadata:{multiplayer_playtest:true}},{id:'old',email:'old@example.com'}]},error:null})}}};
 assert.deepEqual([...await loadPlaytesters(client)],[['a','a@example.com']]);
});
