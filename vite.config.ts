import {defineConfig,loadEnv,type Plugin} from 'vite';
import {configuredMatchHandler} from './server/multiplayer/routes';

/** Run the multiplayer API with Vite so local play needs only one process. */
function localMultiplayer(env:NodeJS.ProcessEnv):Plugin {
 return {
  name:'local-multiplayer',
  apply:'serve',
  configureServer(server){
   const handler=configuredMatchHandler(env);
   server.middlewares.use((req,res,next)=>{
    const pathname=new URL(req.url??'/', 'http://localhost').pathname;
    if(/^\/api\/(?:matches|invitations|multiplayer)(?:\/|$)/.test(pathname)){
     void handler(req,res);
     return;
    }
    next();
   });
  },
 };
}

export default defineConfig(({mode})=>{
 // Server-only configuration; never expose service credentials through `define`.
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 return {
  plugins:[localMultiplayer(env)],
  server:{proxy:{'/api/opponent':'http://127.0.0.1:5174','/api/command':'http://127.0.0.1:5174'}},
 };
});
