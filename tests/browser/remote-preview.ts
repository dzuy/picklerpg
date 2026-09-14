/** Isolated browser fixture. Never imported by production or the dev API entrypoint.
 * Fake test identities, real disposable PostgreSQL, real server and browser code.
 */
import {InvitationService} from '../../server/multiplayer/invitations';
import {pgInvitations} from '../helpers/invitations';
import {createServer} from 'vite';
import {database,PgRepository} from '../helpers/postgres';
import {A,B,C,testers,creation} from '../helpers/remote';
import {MatchService} from '../../server/multiplayer/service';
import {createMatchHandler} from '../../server/multiplayer/routes';
import {ApiError} from '../../server/multiplayer/errors';
const db=await database();await db.pool.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
const service=new MatchService(new PgRepository(db.pool),testers);
const game=await service.create(A,creation());
const handler=createMatchHandler(service,async token=>{if([A,B,C].includes(token))return token;throw new ApiError(401,'authentication','Invalid fixture identity.');},undefined,new InvitationService(pgInvitations(new PgRepository(db.pool)),service,testers));
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5177,strictPort:true},plugins:[{name:'isolated-remote-browser-fixture',enforce:'pre',resolveId(id){if(id.endsWith('/auth-session'))return '\0fixture-auth';},load(id){if(id==='\0fixture-auth')return `const owner=new URLSearchParams(location.search).get('viewer')==='b'?'${B}':'${A}';export const matchCredentials=async()=>({owner,token:owner});export const authClient=()=>({auth:{getSession:async()=>({data:{session:{user:{id:owner,email:owner==='${A}'?'a@example.invalid':'b@example.invalid',user_metadata:{player_name:owner==='${A}'?'A':'B'}}}}}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});`;},configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/invitations')||req.url?.startsWith('/api/matches')||req.url?.startsWith('/api/multiplayer'))void handler(req,res);else next();});}}]});
await server.listen();console.log(`Disposable remote UI fixture: http://127.0.0.1:5177/?multiplayer=1&match=${game.id} (A); add &viewer=b for B.`);
let closing=false;async function close(){if(closing)return;closing=true;await server.close();await db.close();process.exit(0);}process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
