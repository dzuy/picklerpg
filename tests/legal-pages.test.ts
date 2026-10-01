import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
// @ts-ignore server-only module
import {createProductionServer} from '../server/production.mjs';

test('legal URLs serve standalone HTML without starting a game or tracking scripts',async()=>{
 const server=createProductionServer({root:resolve('public')});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const [path,title] of [['privacy','Privacy Policy'],['tos','Terms of Use']]){
   for(const suffix of ['','/','?source=store']){
    const response=await fetch(`${origin}/${path}${suffix}`);
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type')??'',/text\/html/);
    const html=await response.text();
    assert.ok(html.includes(`<h1>${title}</h1>`));
    assert.doesNotMatch(html,/<script\b/i);
    assert.doesNotMatch(html,/\{\{/);
    assert.ok(html.includes('Automatica Labs, LLC'));
    assert.ok(html.includes('mailto:poppy@picklebash.app'));
    assert.ok(html.includes(`https://picklebash.app/${path}`));
    const head=await fetch(`${origin}/${path}${suffix}`,{method:'HEAD'});
    assert.equal(head.status,200);assert.equal(await head.text(),'');
   }
  }
  assert.equal((await fetch(`${origin}/privacy/missing`)).status,404);
  const css=await fetch(`${origin}/legal.css`);assert.equal(css.status,200);assert.match(css.headers.get('content-type')??'',/text\/css/);
 }finally{await new Promise<void>(resolve=>server.close(resolve));}
});
