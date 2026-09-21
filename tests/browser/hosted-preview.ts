/** Real Supabase browser acceptance on two isolated localhost origins. Never used in production. */
import {createServer} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {configuredMatchHandler} from '../../server/multiplayer/routes';
const accounts=JSON.parse(await readFile('.multiplayer-test-accounts.json','utf8'));
const servers=[];
const handler=configuredMatchHandler(process.env);
for(const [name,port] of [['a',5178],['b',5179]] as const){
 const entry='/test-signin/'+randomUUID();
 const server=await createServer({configFile:false,server:{host:'127.0.0.1',port,strictPort:true},plugins:[{name:'localhost-hosted-test-signin',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(/^\/api\/(?:matches|invitations|multiplayer)(?:\/|$)/.test(req.url??'')){void handler(req,res);return;}
  if(req.url!==entry)return next();
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  void(async()=>{const client=createClient(process.env.SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInWithPassword({email:accounts[name].email,password:accounts[name].password});if(error||!data.session){res.writeHead(503).end('Test sign-in failed.');return;}
   const session=JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end(`<h1>Signing in to hosted test account ${name.toUpperCase()}</h1><script type="module">document.querySelector('h1').textContent='Loading account session…';try{const {authClient}=await import('/src/auth-session.ts');document.querySelector('h1').textContent='Installing account session…';const {error}=await authClient().auth.setSession(${session});if(error)document.body.textContent='Sign-in failed';else location.replace('/?multiplayer=1');}catch{document.body.textContent='Sign-in helper failed to load. Check the local server.';}</script>`);
  })().catch(()=>res.writeHead(503).end('Test sign-in failed.'));
 });}}]});await server.listen();servers.push(server);console.log(`Test account ${name.toUpperCase()}: http://127.0.0.1:${port}${entry}`);
}
let closing=false;async function stop(){if(closing)return;closing=true;await Promise.all(servers.map(server=>server.close()));process.exit(0);}process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
