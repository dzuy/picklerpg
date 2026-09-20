import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
const compiled=build({entryPoints:['src/pwa.ts'],bundle:true,write:false,format:'iife',globalName:'Pwa',loader:{'.css':'empty'},plugins:[{name:'test-boundaries',setup(b){
 b.onResolve({filter:/auth-session|multiplayer\/api|browser-storage/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.includes('auth-session')?'export const authClient=()=>globalThis.auth;export const matchCredentials=async()=>globalThis.credentials;':args.path.includes('browser-storage')?'export const browserStorage=globalThis.storage;export const browserSessionStorage=globalThis.sessionStorage;':'export const remoteRequest=(...args)=>globalThis.request(...args);'}));
}}]}).then(r=>r.outputFiles[0].text);
class Element {
 children:Element[]=[];hidden=false;disabled=false;textContent='';className='';type='';open=false;events=new Map<string,()=>void>();onclick?:(event?:any)=>void;
 replaceChildren(...children:Element[]){this.children=children;}append(...children:Element[]){this.children.push(...children)}prepend(child:Element){this.children.unshift(child)}setAttribute(){}addEventListener(name:string,callback:()=>void){this.events.set(name,callback)}showModal(){this.open=true}close(){this.open=false;this.events.get('close')?.()}remove(){}
 find(text:string):Element|undefined{return this.textContent===text?this:this.children.map(c=>c.find(text)).find(Boolean)}
}
const flush=async()=>{await new Promise(resolve=>setTimeout(resolve,15));};
async function client({installed=true,permission='default',result='granted',supported=true,ios=false,existing=false,configFails=false,inviteCreated=true}={}){
 const handlers:any={},requests:any[]=[],storage=new Map();let authCallback:any,permissionCalls=0,subscribeCalls=0,unsubscribed=0;
 const sub={endpoint:'https://web.push.apple.com/a',options:{},toJSON:()=>({endpoint:'https://web.push.apple.com/a',keys:{}}),unsubscribe:async()=>{unsubscribed++;return true}};
 const reg={pushManager:{getSubscription:async()=>existing?sub:null,subscribe:async()=>{subscribeCalls++;return sub}}};
 if(existing)storage.set('pickle-push-owner','account-a');
 const context:any={console,URL,Uint8Array,atob,btoa,isSecureContext:true,navigator:{userAgent:ios?'iPhone':'Chrome',platform:'',maxTouchPoints:0,serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg)}},matchMedia:()=>({matches:installed,addEventListener(){}}),setTimeout,setInterval(){},fetch:async(...args:any[])=>{requests.push(args);return {}},credentials:{owner:'account-a',token:'token'},auth:{auth:{onAuthStateChange:(callback:any)=>authCallback=callback}},storage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},request:async(...args:any[])=>{requests.push(args);if(configFails)throw Error('offline');return {publicKey:btoa('test-key')}}};
 const session=new Map();context.sessionStorage={getItem:(k:string)=>session.get(k)??null,setItem:(k:string,v:string)=>session.set(k,v)};
 context.window=context;context.addEventListener=(name:string,callback:any)=>handlers[name]=callback;
 context.document={createElement:()=>new Element(),body:new Element(),visibilityState:'visible',hasFocus:()=>true,addEventListener:(name:string,cb:any)=>handlers[name]=cb};
 if(supported){context.PushManager={};context.Notification={permission,requestPermission:async()=>{permissionCalls++;context.Notification.permission=result;return result}};}
 vm.runInNewContext(await compiled,vm.createContext(context));
 const host=new Element();context.Pwa.mountTurnPrompt(host);if(inviteCreated)context.Pwa.showTurnPromptAfterInvite();authCallback('SIGNED_IN',{user:{id:'account-a'},access_token:'token'});await flush();
 return {context,host:host.children[0],handlers,requests,counts:()=>({permissionCalls,subscribeCalls,unsubscribed}),button:()=>host.find('Enable Notifications'),authCallback};
}
test('installed opt-in is tap-only; granted persists subscription and clears activity on close',async()=>{
 const c=await client();assert.equal(c.counts().permissionCalls,0);assert.ok(c.button());c.button()!.onclick!();await flush();
 assert.equal(c.counts().permissionCalls,1);assert.equal(c.counts().subscribeCalls,1);assert.equal(c.host.children[0].hidden,true);c.context.Pwa.showTurnPromptAfterInvite();assert.equal(c.host.children[0].hidden,true);assert.ok(c.requests.some(r=>r[1]==='/api/multiplayer/push/subscribe'));
 c.handlers.pagehide();await flush();const request=c.requests.filter(r=>r[0]==='/api/multiplayer/push/activity').at(-1);assert.equal(JSON.parse(request[1].body).active,false);
 await c.context.Pwa.disableDevicePush();assert.equal(c.counts().unsubscribed,1);assert.ok(c.requests.some(r=>r[1]==='/api/multiplayer/push/unsubscribe'));
});
test('denied, dismissed and unsupported permissions never subscribe or nag automatically',async()=>{
 const denied=await client({permission:'denied'});assert.equal(denied.host.children[0].hidden,true);assert.equal(denied.counts().permissionCalls,0);
 for(const result of ['denied','default']){const c=await client({result});c.button()!.onclick!();await flush();assert.equal(c.counts().subscribeCalls,0);c.context.Pwa.showTurnPromptAfterInvite();assert.equal(c.counts().permissionCalls,1);}
 const unsupported=await client({supported:false});assert.equal(unsupported.host.children[0].hidden,true);assert.equal(unsupported.counts().permissionCalls,0);
});
test('iPhone requires Home Screen installation; desktop enables notifications directly',async()=>{
 const phone=await client({installed:false,ios:true});const add=phone.host.find('Add PickleBash')!;add.onclick!();assert.match(phone.context.document.body.children[0].innerHTML,/Tap Share.*Tap Add to Home Screen.*Tap Add/);
 const chrome=await client({installed:false});assert.ok(chrome.button());assert.equal(chrome.button()!.hidden,false);assert.equal(chrome.counts().permissionCalls,0);
 chrome.context.storage.setItem('pickle-install-dismissed','1');chrome.context.Pwa.showTurnPromptAfterInvite();assert.equal(chrome.host.children[0].hidden,false);
 chrome.button()!.onclick!();await flush();assert.equal(chrome.counts().permissionCalls,1);assert.equal(chrome.counts().subscribeCalls,1);
});

test('desktop hides blocked and unsupported notification cards while keeping usable opt-in',async()=>{
 for(const options of [{permission:'denied'},{supported:false}]){const c=await client({installed:false,...options});assert.equal(c.host.children[0].hidden,true);}
 const c=await client({installed:false});assert.equal(c.host.children[0].hidden,false);assert.equal(c.button()?.hidden,false);
});

test('existing successful opt-in stays hidden after reload without prompting again',async()=>{
 const c=await client({installed:false,permission:'granted',existing:true});
 assert.equal(c.host.children[0].hidden,true);assert.equal(c.counts().permissionCalls,0);
 assert.ok(c.requests.some(r=>r[1]==='/api/multiplayer/push/subscribe'));
});

test('existing opt-in remains hidden while restoring and when configuration refresh fails',async()=>{
 const c=await client({installed:false,permission:'granted',existing:true,configFails:true});
 assert.equal(c.host.children[0].hidden,true);
 c.authCallback('TOKEN_REFRESHED',{user:{id:'account-a'},access_token:'token'});
 c.context.Pwa.showTurnPromptAfterInvite();assert.equal(c.host.children[0].hidden,true);
 await flush();assert.equal(c.host.children[0].hidden,true);assert.equal(c.counts().permissionCalls,0);
});

test('lobby and sign-in never open the modal; successful invite explicitly opens it',async()=>{
 const c=await client({inviteCreated:false});
 assert.equal(c.host.open,false);assert.equal(c.counts().permissionCalls,0);
 c.context.Pwa.showTurnPromptAfterInvite();
 assert.equal(c.host.open,true);assert.ok(c.button());assert.equal(c.counts().permissionCalls,0);
 c.host.find('Not right now')!.onclick!({preventDefault(){}});
 assert.equal(c.host.open,false);
 c.context.Pwa.showTurnPromptAfterInvite();assert.equal(c.host.open,false);
});
test('Escape dismissal closes the prompt and auth refresh does not reopen it',async()=>{
 const c=await client();assert.equal(c.host.open,true);c.host.close();
 c.authCallback('TOKEN_REFRESHED',{user:{id:'account-a'},access_token:'token'});await flush();
 assert.equal(c.host.open,false);assert.equal(c.counts().permissionCalls,0);
});
