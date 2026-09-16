import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteError} from '../src/multiplayer/api';
import {NudgeControl,nudgeCopy} from '../src/multiplayer/nudge-control';
class Element {
 children:Element[]=[];hidden=false;disabled=false;textContent='';className='';type='';onclick:()=>void=()=>{};
 append(...children:Element[]){this.children.push(...children)}setAttribute(){}
}
const match={id:'match',version:1,owner:'user',waiting:true,online:true};
const status=(state='ready')=>({state,version:1,availableAt:null,serverTime:new Date().toISOString()});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('button sends only expected version, blocks double taps and retains already-nudged status',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()} as any;
 try{
 const host=new Element(),calls:any[]=[];let resolveSend:any;
 const control=new NudgeControl(host as any,async()=>({owner:'user',token:'token'}),async(...args:any[])=>{calls.push(args);return args[2]?await new Promise(r=>resolveSend=r):status() as any});
 control.update(match);await flush();const [button,hint]=host.children;assert.equal(button.disabled,false);button.onclick();button.onclick();await flush();assert.equal(calls.length,2);assert.deepEqual(calls[1][2],{expectedVersion:1});assert.equal(button.disabled,true);
 resolveSend({...status('already_nudged'),accepted:true});await flush();assert.equal(button.textContent,'Already nudged');assert.equal(button.disabled,true);assert.match(hint.textContent,/Nudge requested/);
 control.update({...match,waiting:false});assert.equal(host.hidden,true);
 }finally{globalThis.document=previous}
});
test('stale status responses cannot enable another match; offline and account changes fail closed',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()} as any;
 try{
 const host=new Element();let resolveRead:any;let count=0;
 const control=new NudgeControl(host as any,async()=>({owner:'user',token:'token'}),async()=>{count++;return await new Promise(r=>resolveRead=r)});
 control.update(match);await flush();control.update({...match,online:false});resolveRead(status());await flush();assert.equal(host.children[0].disabled,true);assert.match(host.children[1].textContent,/Reconnect/);
 control.update({...match,owner:'other'});await flush();assert.equal(count,1);assert.equal(host.children[0].disabled,true);
 }finally{globalThis.document=previous}
});
test('lost send response disables further sends until authoritative status is refreshed',async()=>{
 const previous=globalThis.document,now=Date.now;globalThis.document={createElement:()=>new Element()} as any;let time=100000;Date.now=()=>time;
 try{
 const host=new Element();let claimed=false,posts=0;
 const control=new NudgeControl(host as any,async()=>({owner:'user',token:'token'}),async(_token,_path,body)=>{if(body){posts++;claimed=true;throw Error('Connection lost')}return status(claimed?'already_nudged':'ready') as any});
 control.update(match);await flush();host.children[0].onclick();await flush();assert.equal(host.children[0].disabled,true);host.children[0].onclick();assert.equal(posts,1);
 time+=6000;control.update(match);await flush();assert.equal(host.children[0].textContent,'Already nudged');assert.equal(posts,1);
 }finally{globalThis.document=previous;Date.now=now}
});
test('countdown uses server time rather than device time and daily cap explains all games',()=>{
 assert.match(nudgeCopy({...status('waiting'),state:'waiting',availableAt:'2026-09-15T00:30:00Z',serverTime:'2026-09-15T00:05:00Z'}).hint,/25 min/);
 assert.match(nudgeCopy({...status(),state:'daily_limit'}).hint,/24 hours across all games/);
});

test('nudge setup errors remain visible while the button stays disabled',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()} as any;
 try{
  const host=new Element();
  const message='Nudges need a server setup update before they can be used.';
  const control=new NudgeControl(host as any,async()=>({owner:'user',token:'token'}),async()=>{throw new RemoteError(503,'nudge_setup_required',message)});
  control.update(match);await flush();
  assert.equal(host.children[0].disabled,true);assert.equal(host.children[1].textContent,message);
 }finally{globalThis.document=previous}
});
