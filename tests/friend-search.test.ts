import test from 'node:test';
import assert from 'node:assert/strict';
import {FriendSearch,matchingFriends} from '../src/multiplayer/friend-search';
import type {LobbyTeam} from '../src/multiplayer/team-directory';
const teams=[{id:'1',manager:'peter'},{id:'2',manager:'pete_plays'},{id:'3',manager:'rocket'}] as LobbyTeam[];
class Element {
 children:Element[]=[];attrs=new Map<string,string>();events=new Map<string,(event:any)=>void>();hidden=false;value='';textContent='';id='';parentElement?:Element;
 setAttribute(k:string,v:string){this.attrs.set(k,v)}removeAttribute(k:string){this.attrs.delete(k)}
 append(...nodes:Element[]){this.children.push(...nodes)}after(node:Element){this.parentElement!.append(node)}replaceChildren(){this.children=[]}
 querySelector(){return this.children[0]}addEventListener(name:string,fn:(event:any)=>void){this.events.set(name,fn)}
 fire(name:string,event:any={}){this.events.get(name)?.({preventDefault(){},...event})}
}
test('username search is case-insensitive, accepts @ and limits suggestions',()=>{
 assert.deepEqual(matchingFriends(teams,' @PET ').map(t=>t.id),['2','1']);assert.deepEqual(matchingFriends(teams,''),[]);assert.deepEqual(matchingFriends(teams,'new friend'),[]);
 assert.equal(matchingFriends(Array.from({length:20},(_,i)=>({id:String(i),manager:`player${i}`} as LobbyTeam)),'player').length,8);
});
test('keyboard and pointer selection retain account ID; edits and new names clear it',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
 try{
  const input=new Element(),host=new Element(),hint=new Element();host.append(hint);input.parentElement=host;
  let selected:LobbyTeam|null=null;const search=new FriendSearch(input as unknown as HTMLInputElement,()=>teams,team=>selected=team);
  search.reset();input.value='pet';input.fire('input');assert.equal(selected,null);assert.equal(host.children[1].children.length,2);
  input.fire('keydown',{key:'ArrowDown'});input.fire('keydown',{key:'Enter'});assert.equal((selected as LobbyTeam|null)?.id,'2');assert.equal(input.value,'pete_plays');
  input.value='peter';input.fire('input');assert.equal(selected,null);let prevented=false;host.children[1].children[0].fire('pointerdown',{preventDefault(){prevented=true}});assert.equal(prevented,true,'pointer selection must not blur the input before click');prevented=false;host.children[1].children[0].fire('click',{preventDefault(){prevented=true}});assert.equal(prevented,true,'selection must suppress default label activation');assert.equal((selected as LobbyTeam|null)?.id,'1');
  input.value='pet';input.fire('input');const list=host.children[1],option=list.children[0];
  const touch={pointerType:'touch',isPrimary:true,pointerId:7,clientX:25,clientY:40};
  option.fire('pointerdown',touch);input.fire('blur');assert.equal(list.hidden,false,'blur must not hide an in-progress touch');
  option.fire('pointerup',touch);assert.equal(input.value,'pete_plays');assert.equal((selected as LobbyTeam|null)?.id,'2');assert.equal(list.hidden,true);
  option.fire('click');assert.equal(input.value,'pete_plays');
  input.value='pet';input.fire('input');const scrollOption=list.children[0];scrollOption.fire('pointerdown',touch);scrollOption.fire('pointermove',{...touch,clientY:80});scrollOption.fire('pointerup',{...touch,clientY:80});scrollOption.fire('click');assert.equal(selected,null,'scrolling must not select a friend');
  input.fire('input');const cancelled=list.children[0];cancelled.fire('pointerdown',touch);cancelled.fire('pointercancel');cancelled.fire('click');assert.equal(selected,null,'cancelled touch must not select a friend');
  input.value='New friend';input.fire('input');assert.equal(selected,null);assert.equal(host.children[1].hidden,true);
  search.reset(teams[2]);assert.equal((selected as LobbyTeam|null)?.id,'3');host.children[2].fire('click');assert.equal(selected,null,'explicit link invitation must clear the selected account');assert.equal(input.value,'rocket','guest invite keeps the entered name');assert.match(hint.textContent,/without registering/);search.reset();assert.equal(selected,null);assert.equal(input.value,'');
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
