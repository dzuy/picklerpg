import test from 'node:test';import assert from 'node:assert/strict';
import {playerName,registrationInput,registerPlaytester,loadPlaytesters} from '../server/multiplayer/accounts';
test('playtest registration validates credentials and confirms only a newly created identity',async()=>{
 assert.throws(()=>registrationInput({email:'x@y.com',password:'short'}));assert.throws(()=>registrationInput({email:'x@y.com',password:'long-enough-password',id:'existing'}));
 let request:any;const client:any={auth:{admin:{listUsers:async()=>({data:{users:[]},error:null}),createUser:async(input:any)=>{request=input;return {data:{user:{id:'new'}},error:null};}}}};
 assert.deepEqual(await registerPlaytester(client,{email:' Test@Example.com ',password:'long-enough-password',username:'River_Fox',playerName:'  River  Fox  '}),{created:true});
 assert.equal(request.user_metadata.username,'river_fox');assert.equal(request.user_metadata.player_name,'River Fox');assert.equal(request.email,'test@example.com');assert.equal(request.email_confirm,true);assert.deepEqual(request.app_metadata,{multiplayer_playtest:true});
 client.auth.admin.createUser=async()=>({data:{user:null},error:{code:'email_exists'}});
 await assert.rejects(registerPlaytester(client,{email:'test@example.com',password:'long-enough-password',username:'River_Fox',playerName:'  River  Fox  '}),/already registered/);
});
test('player directory trusts only admin-owned enrollment metadata',async()=>{
 const client:any={auth:{admin:{listUsers:async()=>({data:{users:[{id:'a',email:'a@example.com',user_metadata:{player_name:'River'},app_metadata:{multiplayer_playtest:true}},{id:'b',email:'b@example.com',user_metadata:{multiplayer_playtest:true}},{id:'old',email:'old@example.com'}]},error:null})}}};
 assert.deepEqual([...await loadPlaytesters(client)],[['a','River']]);
});

test('player names are bounded and normalized',()=>{assert.equal(playerName('  River   Fox '),'River Fox');for(const invalid of ['',null,'x'.repeat(33)])assert.throws(()=>playerName(invalid));});

test('playtest passwords accept six plain characters but reject shorter or oversized values',()=>{
 const input={email:'player@example.com',username:'player',playerName:'Player',password:'aaaaaa'};assert.equal(registrationInput(input).password,'aaaaaa');
 for(const password of ['', '12345', 'a'.repeat(129)])assert.throws(()=>registrationInput({...input,password}));
});

test('usernames are required and duplicate handles are rejected without creating an account',async()=>{
 const input={email:'a@example.com',password:'abcdef',playerName:'Bob'};
 for(const username of [undefined,'','ab','bad name','a'.repeat(25)])assert.throws(()=>registrationInput({...input,username}));
 assert.equal(registrationInput({...input,username:' @BoB '}).username,'bob');
 const client:any={auth:{admin:{listUsers:async()=>({data:{users:[{id:'existing',user_metadata:{username:'bob'}}]},error:null}),createUser:()=>assert.fail('duplicate must not create account')}}};
 await assert.rejects(registerPlaytester(client,{...input,username:'BOB'}),/username is taken/);
});

test('fresh guest registration uses the username when no display name exists',()=>{
 const input={email:'player@example.com',password:'abcdef',username:'Dzuy'};
 for(const playerName of [undefined,null,'','   '])assert.equal(registrationInput({...input,playerName}).playerName,'dzuy');
 assert.equal(registrationInput({...input,playerName:'Dzuy Linh'}).playerName,'Dzuy Linh');
});
