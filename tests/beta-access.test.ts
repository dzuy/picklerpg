import test from 'node:test';
import assert from 'node:assert/strict';
import {requiresWebBetaAccount,registeredBetaUser,betaDestination} from '../src/beta-access-policy';
import {entryRoute,gameEntryUrl} from '../src/entry-route';

test('web gameplay requires registration for direct, legacy, saved and invited entries',()=>{
 for(const path of ['/play','/play/','/admin/not-an-admin-page','/?openplay=1','/?game=saved','/challenge/token','/#guestChallenge=token','/?code=callback','/?roster=1']){
  const url=new URL(path,'https://picklebash.app');
  assert.equal(entryRoute(url),'game');
  assert.equal(requiresWebBetaAccount(gameEntryUrl(url),false),true,path);
  assert.equal(requiresWebBetaAccount(gameEntryUrl(url),true),false,path);
 }
 for(const path of ['/admin','/admin/analytics','/admin/todos','/admin/todos/'])assert.equal(requiresWebBetaAccount(new URL(path,'https://picklebash.app'),false),false);
 assert.equal(entryRoute(new URL('https://picklebash.app/')),'home');
});
test('only explicitly registered sessions grant beta play',()=>{
 assert.equal(registeredBetaUser(null),false);
 assert.equal(registeredBetaUser(undefined),false);
 assert.equal(registeredBetaUser({}),false);
 assert.equal(registeredBetaUser({is_anonymous:true}),false);
 assert.equal(registeredBetaUser({is_anonymous:false}),true);
});
test('auth retains exact local destination without accepting an external redirect',()=>{
 for(const path of ['/play?openplay=1&match=abc','/challenge/invitation','/play?game=saved','/play#guestChallenge=token'])assert.equal(betaDestination(new URL(path,'https://picklebash.app')),path);
 assert.equal(betaDestination(new URL('https://picklebash.app/play?beta=signup&invite=abc')),'/play?invite=abc');
 assert.equal(betaDestination(new URL('https://picklebash.app/play?beta=signin&next=https://evil.example')),'/play?next=https%3A%2F%2Fevil.example');
});
