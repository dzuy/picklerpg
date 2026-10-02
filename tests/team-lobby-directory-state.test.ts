import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
class Element {
 children:Element[]=[];dataset={};hidden=false;attributes=new Map<string,string>();onclick?:()=>void;
 animate(){}
 constructor(public tag:string,public textContent=''){}
 append(...children:Element[]){this.children.push(...children)}
 replaceChildren(...children:Element[]){this.children=children}
 setAttribute(key:string,value:string){this.attributes.set(key,value)}
 get text():string{return [this.textContent,...this.children.map(c=>c.text)].join(' ')}
 find(text:string):Element|undefined{return this.textContent===text?this:this.children.map(c=>c.find(text)).find(Boolean)}
}
const bundled=build({entryPoints:['src/multiplayer/team-lobby.ts'],bundle:true,write:false,format:'iife',globalName:'Lobby',plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path.includes('app-navigation')?'export const initialLobbyPage=()=>"friends";export const appNavigation=()=>document.createElement("nav");':path.includes('community-directory')?'export const canShowCommunityAccount=()=>true;':path.includes('avatar-preview')?'export class AvatarThumbnails {}':path.includes('rivalry-view')?'export const rivalryProfile=()=>{};export const rivalryCardStory=()=>{};':''}));
}}]});
test('failed and loading directories do not claim there are no players; retry remains available',async()=>{
 const context:any=vm.createContext({URLSearchParams,location:{search:'?view=community'},history:{replaceState:()=>{}},window:{matchMedia:()=>({matches:false})},document:{createElement:(tag:string)=>new Element(tag)}});
 vm.runInContext((await bundled).outputFiles[0].text,context);
 const lobby=Object.create(context.Lobby.TeamLobby.prototype);lobby.element=new Element('section');lobby.data={self:{id:'viewer'},teams:[],friends:[]};lobby.message='';
 let retries=0;lobby.actions={games:new Element('section'),directoryState:'error',retryDirectory:()=>retries++,create:()=>{}};
 lobby.draw();assert.match(lobby.element.text,/Community could not be loaded/);assert.doesNotMatch(lobby.element.text,/first game|The court is open/);lobby.element.find('Retry').onclick();assert.equal(retries,1);
 lobby.actions.directoryState='loading';lobby.draw();assert.match(lobby.element.text,/Loading players/);assert.doesNotMatch(lobby.element.text,/first game|The court is open|Retry/);
 lobby.actions.directoryState='ready';lobby.draw();assert.match(lobby.element.text,/The court is open/);assert.match(lobby.element.text,/first game/);assert.doesNotMatch(lobby.element.text,/could not be loaded/);
 assert.equal(lobby.element.children[0].children[0].children[0].attributes.get('alt'),'PickleBash');assert.ok(lobby.element.find('My Games'));assert.ok(lobby.element.find('My Friends'));assert.ok(lobby.element.find('Community'));
 assert.equal(lobby.actions.games.hidden,true);lobby.element.find('My Games').onclick();assert.equal(lobby.actions.games.hidden,false);assert.equal(lobby.element.find('My Games').attributes.get('aria-selected'),'true');assert.ok(lobby.element.find('Create a New Game'));
 lobby.element.find('My Friends').onclick();assert.equal(lobby.actions.games.hidden,true);assert.equal(lobby.element.find('My Friends').attributes.get('aria-selected'),'true');assert.ok(lobby.element.find('Build your court circle'));
 lobby.element.find('Community').onclick();assert.equal(lobby.actions.games.hidden,true);assert.equal(lobby.element.find('Community').attributes.get('aria-selected'),'true');
});
