import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,access} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOpponentHandler} from './opponent.mjs';

const defaultRoot=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg'};
export function createProductionServer({root=defaultRoot,apiHandler=createOpponentHandler({provider:'api'}),matchHandler=null}={}){
 const directory=resolve(root);
 return createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
  if(pathname==='/api/invitations'||pathname.startsWith('/api/invitations/')||pathname==='/api/matches'||pathname.startsWith('/api/matches/')||pathname.startsWith('/api/multiplayer/')){if(!matchHandler){res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({error:{code:'disabled',message:'Remote play is not enabled.'}}));return}await matchHandler(req,res);return}
  if(pathname.startsWith('/api/')){req.url=pathname;await apiHandler(req,res);return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return}
  if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'}).end(req.method==='HEAD'?undefined:'{"status":"ok"}');return}
  if(pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(404).end();return}
  const file=resolve(directory,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(directory+sep)){res.writeHead(404).end();return}
  try{
   const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return}
   res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD'){res.end();return}
   const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{res.writeHead(404).end()}
 });
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 await access(resolve(defaultRoot,'index.html'));
 const port=Number(process.env.PORT||5173);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
 const {configuredMatchHandler}=await import('../dist-server/multiplayer.mjs');
 const server=createProductionServer({matchHandler:configuredMatchHandler()});
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.listen(port,'0.0.0.0',()=>console.log(`Pickle RPG listening on 0.0.0.0:${port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref()});
}
