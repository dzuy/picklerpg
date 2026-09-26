import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
const compiled=build({entryPoints:['src/platform/notifications.ts'],bundle:true,write:false,format:'iife',globalName:'Native',plugins:[{name:'native-boundaries',setup(b){
 b.onResolve({filter:/@capacitor|auth-session|multiplayer\/api|browser-storage|view-focus/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='@capacitor/core'?"export const Capacitor={getPlatform:()=> 'ios'};export const registerPlugin=()=>globalThis.badge;":args.path==='@capacitor/push-notifications'?'export const PushNotifications=globalThis.push;':args.path==='@capacitor/app'?'export const App=globalThis.app;':args.path.includes('auth-session')?'export const authClient=()=>globalThis.auth;export const matchCredentials=async()=>globalThis.credentials;':args.path.includes('browser-storage')?'export const browserStorage=globalThis.storage;export const browserSessionStorage=globalThis.storage;':args.path.includes('view-focus')?'export const showViewDialog=()=>{};':'export const remoteRequest=(...args)=>globalThis.request(...args);'}));
}}]}).then(r=>r.outputFiles[0].text);
const flush=()=>new Promise(resolve=>setTimeout(resolve,25));
async function setup(){
 const handlers:any={},calls:any[]=[],stored=new Map<string,string>();let authCallback:any,permission='prompt',permissions=0,registration=0,fail=false;
 const context:any={console,setTimeout,clearTimeout,crypto:{randomUUID:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},location:{assign:(url:string)=>calls.push(['route',url])},credentials:{owner:'a',token:'auth-a'},storage:{getItem:(k:string)=>stored.get(k)??null,setItem:(k:string,v:string)=>stored.set(k,v),removeItem:(k:string)=>stored.delete(k)},badge:{environment:async()=>({value:'production'}),set:async(value:any)=>calls.push(['badge',value.count])},push:{addListener:async(name:string,fn:any)=>handlers[name]=fn,checkPermissions:async()=>({receive:permission}),requestPermissions:async()=>{permissions++;permission='granted';return {receive:permission}},register:async()=>{registration++;queueMicrotask(()=>fail?handlers.registrationError({error:'offline'}):handlers.registration({value:'ab'.repeat(32)}))},unregister:async()=>calls.push(['unregister'])},app:{addListener:async(name:string,fn:any)=>handlers[name]=fn},auth:{auth:{onAuthStateChange:(fn:any)=>authCallback=fn}},request:async(token:string,path:string,body:any)=>{calls.push([path,body,token]);return path.endsWith('/config')?{available:true}:{count:2}}};
 context.window={addEventListener:(name:string,fn:any)=>handlers[name]=fn};
 vm.runInNewContext(await compiled,vm.createContext(context));await flush();
 authCallback('SIGNED_IN',{user:{id:'a'},access_token:'auth-a'});await flush();
 return {context,calls,handlers,stored,authCallback,counts:()=>({permissions,registration}),fail:()=>{fail=true}};
}
test('native startup never asks permission; contextual API saves token and resumes without re-prompting',async()=>{
 const c=await setup();assert.deepEqual(c.counts(),{permissions:0,registration:0});
 assert.equal(await c.context.Native.requestNativeNotifications(),true);
 const registration=c.calls.find(x=>x[0].endsWith('/native/register'));assert.equal(registration[1].environment,'production');assert.equal(registration[1].token,'ab'.repeat(32));
 c.handlers.appStateChange({isActive:true});await flush();assert.equal(c.counts().permissions,1);assert.equal(c.counts().registration,2);
 await c.context.Native.disableNativeNotifications();assert.ok(c.calls.some(x=>x[0].endsWith('/native/disable')));assert.ok(c.calls.some(x=>x[0]==='badge'&&x[1]===0));
});
test('native registration failures reject cleanly and notification taps accept only internal game IDs',async()=>{
 const c=await setup();c.fail();await assert.rejects(c.context.Native.requestNativeNotifications(),/register with Apple/);
 const tap=(data:any)=>c.handlers.pushNotificationActionPerformed({notification:{data}});
 tap({type:'your_turn',gameId:'https://evil.test'});assert.equal(c.calls.filter(x=>x[0]==='route').length,0);
 tap({type:'your_turn',gameId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});assert.equal(c.calls.at(-1)[1],'/?multiplayer=1&match=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
});
test('account switching disables the previous account installation before restoring the new user',async()=>{
 const c=await setup();await c.context.Native.requestNativeNotifications();
 c.context.credentials={owner:'b',token:'auth-b'};c.authCallback('SIGNED_IN',{user:{id:'b'},access_token:'auth-b'});await flush();
 const disabled=c.calls.find(x=>x[0].endsWith('/native/disable'));assert.equal(disabled[2],'auth-a');assert.equal(c.counts().registration,1,'new account has not opted in');
});
