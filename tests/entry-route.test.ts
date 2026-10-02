import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entryRoute,gameEntryUrl} from '../src/entry-route';
test('public root remains marketing, including campaign links and section anchors',()=>{
 for(const path of ['/','/?utm_source=instagram','#courts','/?ref=friend'])assert.equal(entryRoute(new URL(path,'https://picklebash.app')),'home');
});
test('game, native launch, account callbacks and legacy bookmarks retain game entry',()=>{
 for(const path of ['/play','/play/','/?openplay=1&match=abc','/?multiplayer=1','/?home=1','/?roster=1','/?game=abc','/?newgame=1','/?createplayer=1','/?code=auth-code','/#access_token=secret&type=recovery','/#error=access_denied','/#guestChallenge=secret','/challenge/secret','/admin','/admin/','/admin/analytics'])assert.equal(entryRoute(new URL(path,'https://picklebash.app')),'game',path);
 assert.equal(entryRoute(new URL('capacitor://localhost/'),true),'game');
});
test('migration preserves callback fragments, invite IDs and query parameters',()=>{
 const url=new URL('https://picklebash.app/?openplay=1&invite=abc#access_token=secret');
 assert.equal(gameEntryUrl(url).href,'https://picklebash.app/play?openplay=1&invite=abc#access_token=secret');
 assert.equal(url.pathname,'/');
 for(const path of ['/play/','/challenge/abc','/admin/analytics'])assert.equal(gameEntryUrl(new URL(path,'https://picklebash.app')).pathname,path);
});
