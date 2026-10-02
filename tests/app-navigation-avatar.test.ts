import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';

class Element {
 children:Element[]=[];dataset:Record<string,string>={};attributes=new Map<string,string>();parent?:Element;className='';id='';textContent='';src='';
 constructor(public tag:string){}
 set innerHTML(_value:string){this.append(new Element('svg'));}
 append(...children:Element[]){for(const child of children){child.parent=this;this.children.push(child);}}
 prepend(child:Element){child.parent=this;this.children.unshift(child);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 setAttribute(key:string,value:string){this.attributes.set(key,value);}
 addEventListener(){}
 querySelector(selector:string):Element|null {return this.children.find(child=>selector.startsWith('#')?child.id===selector.slice(1):selector.startsWith('.')?child.className===selector.slice(1):child.tag===selector)??this.children.map(child=>child.querySelector(selector)).find(Boolean)??null;}
}
const bundle=build({entryPoints:['src/app-navigation.ts'],bundle:true,write:false,format:'iife',globalName:'Navigation',plugins:[{name:'boundaries',setup(b){
 b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?undefined:{path:a.path,namespace:'mock'});
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path.includes('auth-session')?'export const authClient=()=>client;':path.includes('team-directory')?'export const profileAvatar=(id,appearance)=>appearance??{look:id};':path.includes('avatar-preview')?'export class AvatarThumbnails {get(appearance){return "portrait:"+appearance.look;}}':path.includes('athlete')?'export const preloadAthletes=async()=>{};':path.includes('play-turn-badge')?'export const renderPlayTurnBadge=()=>{};':path.includes('profile-access')?'export const profileAccess=async()=>true;':''}));
}}]});
const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,10));};
async function setup(){
 let session:any=null,listener:(event:string,session:any)=>void=()=>{};
 const pending:((value:any)=>void)[]=[];
 const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>new Promise(resolve=>pending.push(resolve))};
 const client={from:()=>chain,auth:{getSession:async()=>({data:{session}}),onAuthStateChange:(callback:typeof listener)=>{listener=callback;}}};
 const root=new Element('body');
 const context:any=vm.createContext({client,setTimeout,URLSearchParams,location:{search:''},document:{createElement:(tag:string)=>new Element(tag),querySelectorAll:()=>root.children.map(nav=>nav.querySelector('#lobby-nav-profile')).filter(Boolean)}});
 vm.runInContext((await bundle).outputFiles[0].text,context);
 const nav=context.Navigation.appNavigation('games');root.append(nav);await settle();
 return {item:nav.querySelector('#lobby-nav-profile')!,pending,change:(user:any)=>{session=user?{user}:null;listener('USER_UPDATED',session);}};
}
const user=(id:string)=>({id,is_anonymous:false,user_metadata:{username:id}});
test('signed-in navigation uses the saved portrait; guests retain Sign In',async()=>{
 const state=await setup();assert.equal(state.item.querySelector('span')!.textContent,'Sign In');
 state.change(user('alex'));await settle();state.pending.shift()!({data:[{appearance:{look:'saved-alex'}}],error:null});await settle();
 assert.equal(state.item.querySelector('.nav-profile-avatar')?.src,'portrait:saved-alex');assert.equal(state.item.querySelector('span')!.textContent,'alex');
 state.change({...user('guest'),is_anonymous:true});await settle();assert.equal(state.item.querySelector('.nav-profile-avatar'),null);assert.equal(state.item.querySelector('span')!.textContent,'Sign In');
});
test('a portrait finishing after sign-out cannot restore the previous identity',async()=>{
 const state=await setup();state.change(user('alex'));await settle();state.change(null);
 state.pending.shift()!({data:[{appearance:{look:'alex'}}],error:null});await settle();
 assert.equal(state.item.querySelector('.nav-profile-avatar'),null);assert.equal(state.item.attributes.get('aria-label'),'Sign In');
});
test('account changes discard stale portraits and failed reads use the profile fallback',async()=>{
 const state=await setup();state.change(user('alex'));await settle();state.change(user('sam'));await settle();
 state.pending[1]({data:null,error:{message:'Unavailable'}});await settle();state.pending[0]({data:[{appearance:{look:'alex'}}],error:null});await settle();
 assert.equal(state.item.querySelector('.nav-profile-avatar')?.src,'portrait:sam');assert.equal(state.item.attributes.get('aria-label'),'sam — Profile');
});
