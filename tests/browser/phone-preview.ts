/** Explicit same-Wi-Fi playtest. Serves only the production build and a short-lived test-account pairing form. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {build} from 'esbuild';
// @ts-ignore Plain production Node entry.
import {createProductionServer} from '../../server/production.mjs';
import {configuredMatchHandler} from '../../server/multiplayer/routes';
if(!process.argv.includes('--lan'))throw Error('Use --lan to explicitly enable the local-network playtest.');
const host=Object.values(networkInterfaces()).flat().find(x=>x?.family==='IPv4'&&!x.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address))?.address;
if(!host)throw Error('Connect to Wi-Fi before starting phone testing.');
const port=5180,code=randomBytes(6).toString('hex'),expires=Date.now()+15*60*1000;
let used=false,attempts=0;
const accounts=JSON.parse(await readFile('.multiplayer-test-accounts.json','utf8'));
const url=process.env.SUPABASE_URL!,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const clientCode=await build({stdin:{contents:`import {createClient} from '@supabase/supabase-js';const form=document.querySelector('form');form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const response=await fetch('/test-pair-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:form.code.value.trim().toLowerCase()})});const data=await response.json();if(!response.ok)throw Error(data.error);const client=createClient(${JSON.stringify(url)},${JSON.stringify(key)});const {error}=await client.auth.setSession(data);if(error)throw error;location.replace('/?multiplayer=1');}catch(e){document.querySelector('[role=status]').textContent=e.message;button.disabled=false;}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',minify:true});
const production=createProductionServer({matchHandler:configuredMatchHandler()});
const server=createServer(async(req,res)=>{
 const path=new URL(req.url!,'http://localhost').pathname;
 if(!path.startsWith('/test-pair')){production.emit('request',req,res);return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 if(path==='/test-pair'&&req.method==='GET'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Join PickleBash</title><style>body{background:#f4f3eb;color:#163d30;font:16px Arial;margin:0;padding:48px 24px}main{max-width:400px;margin:auto}h1{font-size:42px;letter-spacing:-2px}input,button{box-sizing:border-box;display:block;width:100%;font:inherit;padding:16px;border:1px solid #b9cbb9;border-radius:12px;margin:12px 0}button{background:#163d30;color:#edffa0}p{line-height:1.5}</style><main><strong>PICKLEBASH</strong><h1>Meet you<br>on court.</h1><p>Enter the pairing code from your computer to join as Player 2.</p><form><label for="code">Pairing code</label><input id="code" name="code" required autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="12"><button>Join the playtest ↗</button></form><p role="status">This code works once and expires after 15 minutes.</p></main><script type="module" src="/test-pair-client.js"></script>`);return;
 }
 if(path==='/test-pair-client.js'&&req.method==='GET'){res.setHeader('Content-Type','text/javascript');res.end(clientCode.outputFiles[0].text);return;}
 if(path!=='/test-pair-session'||req.method!=='POST'){res.writeHead(404).end();return;}
 const fail=(status:number,message:string)=>{res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify({error:message}));};
 if(req.headers.origin!==`http://${host}:${port}`){fail(403,'Open the pairing page on this Wi-Fi address.');return;}
 if(used||Date.now()>expires||attempts>=10){fail(410,'Pairing has expired. Ask for a fresh code on the computer.');return;}
 let body='';try{for await(const part of req){body+=part;if(body.length>256){fail(413,'Pairing request too large.');return;}}const input=JSON.parse(body);attempts++;if(typeof input.code!=='string'||input.code.length!==code.length||!timingSafeEqual(Buffer.from(input.code),Buffer.from(code))){fail(403,'Check the pairing code and try again.');return;}
 used=true;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInWithPassword({email:accounts.b.email,password:accounts.b.password});if(error||!data.session){used=false;fail(503,'Sign-in could not finish. Try again.');return;}
 res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token}));
 }catch{fail(400,'Unable to pair. Check the code and try again.');}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,host,()=>console.log(`Phone pairing: http://${host}:${port}/test-pair\nOne-use Player 2 code (expires in 15 minutes): ${code}\nAfter pairing: http://${host}:${port}/?multiplayer=1`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
