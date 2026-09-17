import test from 'node:test';
import assert from 'node:assert/strict';
import {signInAccount} from '../server/multiplayer/sign-in';
const session={access_token:'test-access',refresh_token:'test-refresh'};
function directory(){return {from:(table:string)=>{assert.equal(table,'usernames');return {select:()=>({eq:(_key:string,value:string)=>({maybeSingle:async()=>({data:value==='bob'?{user_id:'bob-id'}:null,error:null})})})};},auth:{admin:{getUserById:async(id:string)=>{assert.equal(id,'bob-id');return {data:{user:{email:'private@example.com',is_anonymous:false}},error:null};}}}} as any;}
for(const identifier of ['bob','@bob',' BoB '])test(`username sign-in resolves ${identifier} and verifies password`,async()=>{
 assert.deepEqual(await signInAccount(directory(),async credentials=>{assert.deepEqual(credentials,{email:'private@example.com',password:'secret'});return session;},{identifier,password:'secret'}),session);
});
test('email sign-in bypasses username lookup',async()=>{
 assert.deepEqual(await signInAccount({} as any,async credentials=>{assert.equal(credentials.email,'bob@example.com');return session;},{identifier:' Bob@Example.com ',password:'secret'}),session);
});
test('unknown usernames and wrong passwords have the same error and reveal no email',async()=>{
 const errors=[];
 for(const identifier of ['missing','bob','bob@example.com'])try{await signInAccount(directory(),async()=>null,{identifier,password:'wrong'});assert.fail('must fail');}catch(error){errors.push((error as Error).message);}
 assert.equal(new Set(errors).size,1);assert.ok(!errors[0].includes('private@example.com'));
});
test('empty, malformed, and oversized sign-in requests are rejected before authentication',async()=>{
 for(const input of [null,[],{}, {identifier:'bob',password:''},{identifier:'bob',password:'x'.repeat(129)},{identifier:'a'.repeat(255),password:'secret'}])await assert.rejects(signInAccount({} as any,async()=>assert.fail('must not authenticate'),input));
});
