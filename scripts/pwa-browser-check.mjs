// Local-only browser fixture. Real PWA module/DOM/styles/worker; account and
// permission/subscription boundaries are simulated and visibly labelled.
import {build} from 'esbuild';
import {mkdtemp,writeFile,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProductionServer} from '../server/production.mjs';
import webpush from 'web-push';
const root=await mkdtemp(join(tmpdir(),'picklebash-pwa-browser-'));
const publicKey=webpush.generateVAPIDKeys().publicKey;
await build({entryPoints:['src/pwa.ts'],bundle:true,format:'esm',outfile:join(root,'pwa.js'),plugins:[{name:'qa-boundaries',setup(b){
 b.onResolve({filter:/auth-session|multiplayer\/api/},args=>({path:args.path,namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:args.path.includes('auth-session')?`export const authClient=()=>({auth:{onAuthStateChange(fn){setTimeout(()=>fn('INITIAL_SESSION',{user:{id:'qa-user'},access_token:'qa-token'}),0)}}});export const matchCredentials=async()=>({owner:'qa-user',token:'qa-token'});`:`export const remoteRequest=async(token,path,body)=>{window.qaEvents.push(path);window.qaReport();return {publicKey:${JSON.stringify(publicKey)}}};`}));
}}]});
await copyFile('public/sw.js',join(root,'sw.js'));
await writeFile(join(root,'index.html'),`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>PickleBash local PWA check</title><link rel="stylesheet" href="/pwa.css"><style>body{margin:24px;font:16px/1.5 system-ui;background:#f7f8f3;color:#163c36}main{max-width:700px;margin:auto}nav{display:flex;flex-wrap:wrap;gap:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}a{color:#163c36}</style></head><body><main><h1>PickleBash PWA browser check</h1><p>LOCAL TEST FIXTURE · Real interface and service worker. Account, permission, and subscription results are simulated. No live push delivery.</p><nav><a href="/?mode=browser">Browser</a><a href="/?mode=ios">iPhone instructions</a><a href="/?mode=granted">Installed / grant</a><a href="/?mode=denied">Installed / denied</a><a href="/?mode=default">Installed / dismiss</a><a href="/?mode=unsupported">Installed / unsupported</a></nav><div id="lobby"></div><h2>Checks</h2><pre id="checks"></pre></main><script>
const mode=new URLSearchParams(location.search).get('mode')||'browser';
localStorage.removeItem('pickle-install-dismissed');localStorage.removeItem('pickle-push-owner');
window.qaEvents=[];window.qaPermissionCalls=0;window.qaWorker='registering';
window.qaReport=()=>document.querySelector('#checks').textContent=JSON.stringify({mode,worker:window.qaWorker,permissionRequests:window.qaPermissionCalls,events:window.qaEvents},null,2);
window.addEventListener('error',e=>{window.qaEvents.push('ERROR: '+e.message);window.qaReport()});
window.addEventListener('unhandledrejection',e=>{window.qaEvents.push('REJECTION: '+e.reason);window.qaReport()});
if(mode==='ios')Object.defineProperty(navigator,'userAgent',{value:'iPhone'});
if(!['ios','browser'].includes(mode)){const media=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){}}:media(q);}
if(mode==='unsupported')Object.defineProperty(window,'PushManager',{value:undefined,configurable:true});
if(mode==='unsupported')delete window.PushManager;
if(['granted','denied','default'].includes(mode)){
 Object.defineProperty(window,'Notification',{value:{permission:mode==='denied'?'denied':'default',requestPermission:async()=>{window.qaPermissionCalls++;Notification.permission=mode;window.qaReport();return mode}},configurable:true});
 const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);
 navigator.serviceWorker.register=async(...args)=>{const reg=await register(...args);let sub=null;reg.pushManager.getSubscription=async()=>sub;reg.pushManager.subscribe=async()=>{window.qaEvents.push('subscribe');window.qaReport();return sub={endpoint:'https://web.push.apple.com/qa-only',options:{},toJSON(){return {endpoint:this.endpoint,keys:{}}},unsubscribe:async()=>true}};return reg};
}
const fetchOriginal=window.fetch.bind(window);window.fetch=(url,options)=>{if(url==='/api/multiplayer/push/activity'){window.qaEvents.push('activity:'+JSON.parse(options.body).active);window.qaReport();return Promise.resolve(new Response('{}'))}return fetchOriginal(url,options)};
navigator.serviceWorker.ready.then(reg=>{window.qaWorker=reg.active?.state||'ready';window.qaReport()}).catch(e=>{window.qaWorker=String(e);window.qaReport()});
window.qaReport();
</script><script type="module">import {mountTurnPrompt,setTurnPromptEligible} from '/pwa.js';mountTurnPrompt(document.querySelector('#lobby'));setTurnPromptEligible(true);</script></body></html>`);
const server=createProductionServer({root});server.listen(5187,'127.0.0.1',()=>console.log('PWA browser fixture: http://127.0.0.1:5187/'));
