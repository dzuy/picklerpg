import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
class Element {
 dataset:Record<string,string>={};children:any[]=[];className='';textContent='';isConnected=true;
 append(...children:any[]){for(const child of children){this.children=this.children.filter(c=>c!==child);this.children.push(child)}}
 replaceChildren(...children:any[]){this.children=children}setAttribute(){}querySelector(){return null}
}
test('empty roster exposes roster choices and can recover to an acceptable two-player team',async()=>{
 const result=await build({entryPoints:['src/multiplayer/team-picker.ts'],bundle:true,write:false,format:'iife',globalName:'Picker',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?undefined:{path:args.path,namespace:'mock'});b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:
 path.includes('auth-session')?'export const authClient=()=>null;':
 path.includes('cloud-players')?'export const playerFromRow=row=>row;':
 path.includes('default-lineup')?'export const defaultLineup=players=>[players[0]?.id,players[1]?.id??players[0]?.id].filter(Boolean);':
 path.includes('roster-membership')?'export const rosterStarters=()=>[];export const ownedRosterPlayers=p=>p;':
 path.includes('community-section')?'export class CommunitySection {element=document.createElement("section");constructor(changed){globalThis.addRosterPlayers=changed}async load(){globalThis.addRosterPlayers([])}}':
 path.includes('community-players')?'export const refreshCommunityDesigns=async t=>t;':
 path.includes('player-design')?'export const parseLibrary=()=>({players:[]});export const PLAYER_STORAGE_KEY="players";':
 path.includes('browser-storage')?'export const browserStorage={getItem:()=>null};':
 path.includes('athlete')?'export const preloadAthletes=async()=>{};':
 path.includes('avatar-preview')?'export class AvatarThumbnails {get(){return ""}}':
 path.includes('player-card')?'export const fillPlayerCard=()=>{};':
 path.includes('player-details')?'export const attachPlayerDetails=()=>{};':
 'export const cyclePlayer=()=>[];'
}));}}]});
 const context:any={document:{createElement:()=>new Element()},structuredClone};vm.runInNewContext(result.outputFiles[0].text,vm.createContext(context));
 const host=new Element(),picker=new context.Picker.TeamPicker(host);await assert.rejects(picker.freshTeam(),/Add a player/);
 assert.ok(host.children.some(c=>c.textContent.includes('Add a player')));assert.ok(host.children.some(c=>c===picker.community.element));
 context.addRosterPlayers([{id:'one',appearance:{}}]);assert.equal(host.children.includes(picker.community.element),false);assert.deepEqual(Array.from(await picker.freshTeam(),(p:any)=>p.id),['one','one']);
 const seeded=new context.Picker.TeamPicker(new Element(),undefined,[{id:'saved',appearance:{}},{id:'saved',appearance:{}}]);assert.deepEqual(Array.from(await seeded.freshTeam(),(p:any)=>p.id),['saved','saved']);
 context.addRosterPlayers=(players:any[])=>picker.setCommunity(players);
 context.addRosterPlayers([{id:'one',appearance:{}},{id:'two',appearance:{}}]);assert.equal(host.children.includes(picker.community.element),false);assert.deepEqual(Array.from(await picker.freshTeam(),(p:any)=>p.id),['one','one']);
});
