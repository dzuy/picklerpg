// Browser fixture exercises the real control with a simulated authenticated transport.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle=await build({entryPoints:['src/multiplayer/trash-talk-control.ts'],bundle:true,format:'esm',outdir:'/tmp/trash-talk-qa',write:false});
const css=await readFile('src/multiplayer/remote.css','utf8');
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trash talk QA</title><link rel="stylesheet" href="/control.css"><style>${css}#remote-game{background:linear-gradient(#789f84,#396258)!important}#settings{position:absolute;top:20px;left:20px;background:white;padding:10px}#player{position:absolute;top:50%;left:50%;font-size:50px}</style><body class="remote-playing"><main id="app" class="remote-app"><section id="remote-game"><div id="player">🏓</div><div id="settings"></div><div class="remote-move-banner"><p>Waiting for your opponent</p></div></section></main><script type="module">
import {TrashTalkControl} from '/control.js';
let messages=[],replay=null;const match={id:'qa',version:1};
const control=new TrashTalkControl(document.querySelector('#remote-game'),document.querySelector('#settings'),async()=>({owner:'qa',token:'qa'}),()=>{},async(_token,_path,body)=>{if(body)messages.push({id:body.id,text:body.text.replace(/\\bshit\\b/gi,'!@#$%'),player:'you',version:0,createdAt:new Date().toISOString()});return {messages,serverTime:new Date().toISOString()}});
control.update(match,'qa');const replayButton=document.createElement('button');replayButton.textContent='Replay';replayButton.onclick=()=>{replay=replay===null?0:null};document.querySelector('#settings').append(replayButton);
function frame(){control.frame({projectSpeech:()=>({x:innerWidth/2,y:innerHeight/2,visible:true})},{players:[{id:'you',position:{x:0,z:0}}]},replay,true);requestAnimationFrame(frame)}frame();
</script>`;
createServer((req,res)=>{const asset=req.url==='/control.js'?bundle.outputFiles.find(f=>f.path.endsWith('.js')):req.url==='/control.css'?bundle.outputFiles.find(f=>f.path.endsWith('.css')):null;res.setHeader('Content-Type',req.url==='/control.js'?'text/javascript':req.url==='/control.css'?'text/css':'text/html');res.end(asset?asset.text:html)}).listen(5189,'127.0.0.1',()=>console.log('Trash talk QA: http://127.0.0.1:5189'));
