import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

const compiled=build({entryPoints:['src/multiplayer/trash-talk-control.ts'],bundle:true,write:false,format:'iife',globalName:'Reactions',loader:{'.css':'empty'},plugins:[{name:'ui-boundaries',setup(b){
 b.onResolve({filter:/account-safety$|view-focus$|hud-button$|\/api$|browser-storage$|\/sound$/},args=>({path:args.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const openPlayerSafety=()=>{};export const focusView=()=>{};export const showViewDialog=()=>{};export const hudButtonIcon=()=>"";export const remoteRequest=()=>{};export const browserStorage={getItem:()=>null};export const sounds={play:()=>{}};'}));
}}]}).then(result=>result.outputFiles[0].text);

test('reactions send on LAN HTTP and retries reuse the message ID',async()=>{
 const context:any={crypto:{getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)},performance,console};
 vm.runInNewContext(await compiled,context);
 // Exercise the real send path with a fake transport, without contacting another player.
 const control=Object.create(context.Reactions.TrashTalkControl.prototype);
 const calls:{id:string;text:string}[]=[];let closed=false;
 Object.assign(control,{match:{id:'match',version:1},owner:'you',generation:0,revision:0,sending:false,cooldown:0,pending:null,hint:{textContent:''},input:{value:'Nice!'},history:{scrollTop:0,scrollHeight:100},count:{textContent:''},
  credentials:async()=>({owner:'you',token:'test'}),
  request:async(_token:string,_path:string,body:{id:string;text:string})=>{calls.push(body);if(calls.length===1)throw Error('Offline');return {messages:[],serverTime:new Date().toISOString()};},
  accept:()=>{},open:(value:boolean)=>{closed=!value;},
 });
 await control.send('Nice!');
 assert.equal(control.hint.textContent,'Offline');assert.equal(control.sending,false);
 assert.equal(control.input.value,'Nice!');
 await control.send('Nice!');
 assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);
 assert.match(calls[0].id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(calls[1].text,'Nice!');assert.equal(control.pending,null);assert.equal(control.input.value,'');assert.equal(closed,false);
});

test('stale polling cannot restore blocked messages or cross account changes',async()=>{
 const context:any={performance,console};vm.runInNewContext(await compiled,context);
 for(const change of ['generation','revision']){
  let resolve!:(feed:any)=>void;let accepted=false;let started!:()=>void;const requested=new Promise<void>(r=>{started=r});
  const control=Object.create(context.Reactions.TrashTalkControl.prototype);
  Object.assign(control,{match:{id:'match'},owner:'alice',generation:0,revision:0,fetching:false,credentials:async()=>({owner:'alice',token:'test'}),request:()=>new Promise(r=>{resolve=r;started()}),accept:()=>{accepted=true}});
  const polling=control.refresh();await requested;control[change]++;
  resolve({messages:[{text:'Private'}],serverTime:new Date().toISOString()});await polling;
  assert.equal(accepted,false,change);
 }
});

test('switching accounts while credentials load prevents sending the old draft',async()=>{
 const context:any={crypto:{getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)},performance,console};vm.runInNewContext(await compiled,context);
 let resolve!:(value:any)=>void;let sent=false;
 const control=Object.create(context.Reactions.TrashTalkControl.prototype);
 Object.assign(control,{match:{id:'match'},owner:'alice',generation:0,revision:0,sending:false,cooldown:0,pending:null,hint:{textContent:''},credentials:()=>new Promise(r=>{resolve=r}),request:()=>{sent=true}});
 const sending=control.send('Private draft');control.generation++;control.owner='bob';resolve({owner:'alice',token:'old'});await sending;assert.equal(sent,false);
});
