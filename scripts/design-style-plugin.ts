import type {Plugin} from 'vite';
import {createStyleStore} from './design-style-store';

/** File writes are available only in the local development server, never production. */
export function designStyles():Plugin{
 return {name:'local-design-styles',apply:'serve',configureServer(server){
  const store=createStyleStore(server.config.root);
  server.middlewares.use((req,res,next)=>{
   if(req.url?.split('?')[0]!=='/__design/styles'){next();return}
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   const send=(status:number,body:unknown)=>{res.statusCode=status;res.end(JSON.stringify(body))};
   void (async()=>{
    const host=req.headers.host??'';const url=new URL(`http://${host}`);
    if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){send(403,{error:'Style editing is available on localhost only.'});return}
    if(req.method==='GET'){send(200,{library:await store.read()});return}
    if(req.method!=='POST'){send(405,{error:'Use GET or POST.'});return}
    if(!req.headers.origin||new URL(req.headers.origin).host!==host||req.headers['sec-fetch-site']==='cross-site'||!req.headers['content-type']?.startsWith('application/json')){send(403,{error:'Use the local design preview to save styles.'});return}
    let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){send(413,{error:'Style request is too large.'});return}}
    const request=JSON.parse(body);if(!request||typeof request!=='object'||Array.isArray(request))throw new Error('Invalid style request.');
    send(200,await store.mutate(request));
   })().catch(error=>send(400,{error:error instanceof Error?error.message:'Could not save the style.'}));
  });
 }};
}
