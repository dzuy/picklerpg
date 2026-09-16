/** Isolated guest onboarding fixture: real engine and UI, in-memory matches, fake auth. */
import {createServer} from 'vite';
import {MatchService} from '../../server/multiplayer/service';
import {createMatchHandler} from '../../server/multiplayer/routes';
import {A,B,testers,creation,action,MemoryRepository} from '../helpers/remote';
const repo=new MemoryRepository(),service=new MatchService(repo,testers);
const row=service.prepare(A,creation());row.friend_state='pending';await repo.create(row);
row.checkpoint=(await service.friendOpening(row.id,A))!;row.friend_state='accepted';row.current_action_user_id=B;row.resolution_secret='0'.repeat(64);repo.rows.set(row.id,row);
const handler=createMatchHandler(service,async()=>B);
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5178,strictPort:true},plugins:[{
 name:'guest-fixture',enforce:'pre',
 transformIndexHtml(){return [{tag:'script',children:"localStorage.setItem('pickle-email-accounts-v1','1')",injectTo:'head-prepend'}]},
 resolveId(id){if(id.endsWith('/auth-session'))return '\0guest-auth'},
 load(id){if(id==='\0guest-auth')return `export const playerPasswordSession=async()=>null;export const matchCredentials=async()=>({owner:'${B}',token:'fixture'});export const authClient=()=>({auth:{getSession:async()=>({data:{session:{user:{id:'${B}',is_anonymous:true,user_metadata:{player_name:'Guest'}}}}}),signOut:async()=>({error:null}),onAuthStateChange:()=>({})}});`;},
 configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url==='/fixture-return'&&req.method==='POST'){void(async()=>{const s=await service.get(row.id,A);await service.act(row.id,A,action(s));res.end('ok')})().catch(e=>{res.statusCode=500;res.end(String(e))});return;}
  if(req.url?.startsWith('/api/matches')||req.url?.startsWith('/api/multiplayer'))void handler(req,res);else next();
 });}
}]});
await server.listen();console.log(`Guest preview: http://127.0.0.1:5178/?multiplayer=1&match=${row.id}`);
