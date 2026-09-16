import test from 'node:test';
import assert from 'node:assert/strict';
import {guestRegistration,type PlayerSession} from '../src/multiplayer/guest-registration';
const credentials={email:'player@example.test',password:'test-password'},fresh:PlayerSession={access_token:'new-access',refresh_token:'new-refresh',user:{id:'original-player'}};
test('password upgrade installs fresh tokens for the original player, never refreshes revoked guest tokens',async()=>{
 const events:string[]=[];const finish=guestRegistration('original-player',async c=>{assert.deepEqual(c,credentials);events.push('register');},{signIn:async c=>{assert.deepEqual(c,credentials);events.push('sign-in');return fresh;},install:async s=>{assert.equal(s,fresh);events.push('install');}});
 await finish(credentials);assert.deepEqual(events,['register','sign-in','install']);
});
test('failed password sign-in retries without needing a guest session or registering twice',async()=>{
 let writes=0,attempts=0,installed=0;const finish=guestRegistration('original-player',async()=>{writes++;},{signIn:async c=>{assert.deepEqual(c,credentials);if(++attempts===1)throw Error('offline');return fresh;},install:async()=>{installed++;}});
 await assert.rejects(finish(credentials),/player was saved/);await finish({email:'edited@example.test',password:'changed'});assert.equal(writes,1);assert.equal(installed,1);
});
test('a different account is never installed over the invited player',async()=>{
 const finish=guestRegistration('original-player',async()=>{}, {signIn:async()=>({...fresh,user:{id:'other-player'}}),install:async()=>assert.fail('must keep original identity')});
 await assert.rejects(finish(credentials),/different player/);
});
test('failed account creation keeps the original session untouched',async()=>{
 const finish=guestRegistration('original-player',async()=>{throw Error('email already used');},{signIn:async()=>{assert.fail('must not sign in to an existing account');},install:async()=>assert.fail('must not replace session')});
 await assert.rejects(finish(credentials),/email already used/);
});
