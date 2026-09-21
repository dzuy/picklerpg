/** Four isolated local origins. No hosted accounts, credentials, or database access. */
import {createServer,type ViteDevServer} from 'vite';
import {randomUUID} from 'node:crypto';
import {createInviteLab,A,B} from '../helpers/invite-lab';
const lab=createInviteLab(),servers:ViteDevServer[]=[],runId=randomUUID();
const modes=[{port:5195,name:'Alice · sender',id:A},{port:5196,name:'Bob · returning player',id:B},{port:5197,name:'Bob · fresh guest',id:null},{port:5198,name:'Bob · storage blocked',id:null}];
for(const mode of modes){
 const server=await createServer({configFile:false,envFile:false,server:{host:'127.0.0.1',port:mode.port,strictPort:true},plugins:[{
  name:'local-invitation-lab',enforce:'pre',
  transformIndexHtml(){return mode.port===5198?[{tag:'script',injectTo:'head-prepend',children:`for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new DOMException('Simulated storage restriction','SecurityError')}});`}]:[];},
  resolveId(id){if(/(?:^|\/)auth-session(?:\.ts)?$/.test(id))return '\0invite-lab-auth';},
  load(id){if(id!=='\0invite-lab-auth')return;return `
import {browserStorage} from '/src/browser-storage.ts';
const key='invite-lab-session';
if(browserStorage.getItem('invite-lab-run')!==${JSON.stringify(runId)}){browserStorage.removeItem(key);browserStorage.setItem('invite-lab-run',${JSON.stringify(runId)});}
const make=(id,guest)=>({access_token:id,user:{id,is_anonymous:guest,email:guest?undefined:'test@example.invalid',user_metadata:{player_name:${JSON.stringify(mode.id===A?'Alice':'Bob')},roster_starters:['preset-0','preset-1']}}});
let session=JSON.parse(browserStorage.getItem(key)||'null');
if(!session&&${JSON.stringify(mode.id)}){session=make(${JSON.stringify(mode.id)},false);browserStorage.setItem(key,JSON.stringify(session));}
const callbacks=new Set();
const install=s=>{session=s;if(s)browserStorage.setItem(key,JSON.stringify(s));else browserStorage.removeItem(key);for(const callback of callbacks)callback(s?'SIGNED_IN':'SIGNED_OUT',s);return {data:{session:s},error:null};};
const empty={data:[],error:null};
const query=()=>{const q={then:(resolve)=>Promise.resolve(empty).then(resolve)};for(const name of ['select','eq','order','range','in','insert','upsert','delete'])q[name]=()=>q;q.maybeSingle=async()=>({data:null,error:null});return q;};
const client={from:query,rpc:async(name)=>({data:name==='my_skill_budget'?35:[],error:null}),auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:callback=>{callbacks.add(callback);return {data:{subscription:{unsubscribe:()=>callbacks.delete(callback)}}};},signInAnonymously:async()=>install(make((await (await fetch('/__lab/guest',{method:'POST'})).json()).id,true)),refreshSession:async()=>({data:{session},error:null}),signOut:async()=>install(null),signInWithPassword:async()=>install(make('${B}',false)),setSession:async s=>install(s),updateUser:async()=>({data:{user:session?.user},error:null})}};
export const authClient=()=>client;
export const playerPasswordSession=async()=>make('${B}',false);
export async function matchCredentials(){if(!session)throw Error('Sign in to return to this game.');return {owner:session.user.id,token:session.access_token};}
`;},
  configureServer(server){server.middlewares.use((req,res,next)=>{
   const path=new URL(req.url??'/','http://localhost').pathname;
   if(path==='/sw.js'){res.writeHead(404).end();return;}
   if(path==='/__lab/guest'&&req.method==='POST'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:lab.guest()}));return;}
   if(path==='/__lab'){
    res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PickleBash invitation lab</title><style>body{font:18px system-ui;max-width:850px;margin:40px auto;padding:20px}input,button{font:inherit;padding:12px;margin:8px 0}input{width:95%}a{display:block;margin:16px 0}</style><h1>Invitation lab</h1><p>Local simulation · ${mode.name}. Accounts and games here never touch production.</p><a href="/?openplay=1">Open this player’s games</a><p>Create an invitation as Alice. Paste its copied link below, then choose the recipient. Each port has separate browser storage.</p><label>Copied invitation link<input id="link" placeholder="http://127.0.0.1:5195/challenge/…"></label><div id="recipients"></div><p id="error" role="status"></p><p>Create a separate challenge for each recipient scenario. Keep the blocked-storage tab open while playing; refreshing deliberately loses its guest sign-in.</p><script>const modes=${JSON.stringify(modes)};for(const mode of modes){const button=document.createElement('button');button.textContent=mode.name;button.onclick=()=>{try{const url=new URL(document.getElementById('link').value);if(!/^\\/challenge\\/[A-Za-z0-9_-]{43}$/.test(url.pathname))throw Error('Paste a full challenge link.');window.open('http://127.0.0.1:'+mode.port+url.pathname,'_blank','noopener');}catch(e){document.getElementById('error').textContent=e.message;}};document.getElementById('recipients').append(button);}</script>`);return;
   }
   if(path.startsWith('/api/')){void lab.handler(req,res);return;}
   next();
  });},
 }]});
 try{await server.listen();servers.push(server);}catch(error){await server.close();await Promise.all(servers.map(s=>s.close()));throw error;}
 console.log(`${mode.name}: http://127.0.0.1:${mode.port}/__lab`);
}
let closing=false;async function stop(){if(closing)return;closing=true;await Promise.all(servers.map(s=>s.close()));process.exit(0);}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
