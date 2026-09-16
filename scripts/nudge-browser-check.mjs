// Real nudge control and app styles; simulated authenticated API responses.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle=await build({entryPoints:['src/multiplayer/nudge-control.ts'],bundle:true,format:'esm',write:false});
const css=await readFile('src/multiplayer/remote.css','utf8');
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nudge browser QA</title><style>${css}</style><body class="remote-playing"><main id="app" class="remote-app"><section id="remote-game"><p style="color:white;position:relative;z-index:20">Nudge QA · simulated API<br><button id="ready">Eligible</button><button id="own">Your turn</button></p><div class="remote-move-banner"><p>Waiting for Luna</p><div id="nudge"></div></div></section></main><script type="module">
import {NudgeControl} from '/control.js';
let version=0,state='ready';
const match=()=>({id:'qa',version,owner:'qa',waiting:state!=='not_waiting',online:true});
const control=new NudgeControl(document.querySelector('#nudge'),async()=>({owner:'qa',token:'simulated'}),async(_token,_path,body)=>{const now=Date.now();return {state,version,unlimited:true,serverTime:new Date(now).toISOString(),availableAt:new Date(now+30*60000).toISOString(),accepted:!!body}});
for(const [id,next] of Object.entries({ready:'ready',own:'not_waiting'}))document.getElementById(id).onclick=()=>{version++;state=next;control.update(match())};
control.update(match());
</script></body>`;
createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/control.js'?'text/javascript':'text/html');res.end(req.url==='/control.js'?bundle.outputFiles[0].text:html)}).listen(5188,'127.0.0.1',()=>console.log('Nudge browser fixture: http://127.0.0.1:5188/'));
