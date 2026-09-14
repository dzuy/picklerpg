import {createServer} from 'node:http';
import {configuredMatchHandler} from './routes';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export {configuredMatchHandler};
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const server=createServer(configuredMatchHandler());
 server.requestTimeout=15000;server.headersTimeout=10000;
 const port=Number(process.env.MULTIPLAYER_PORT||5175);
 server.listen(port,'127.0.0.1',()=>console.log(`Remote test API listening on 127.0.0.1:${port}`));
}
export {createMatchHandler} from './routes';
export {MatchService} from './service';
