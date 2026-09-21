import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchShare,invitationShare,showGameShare} from '../src/multiplayer/game-share';
test('existing-player invitations retain their invitation URL until a match exists',()=>{
 const pending=invitationShare({id:'invite-id',recipientName:'maeling',status:'pending',matchId:null});
 assert.equal(pending.path,'/?openplay=1&invite=invite-id');assert.match(pending.description,/sign in as that player/);
 const accepted=invitationShare({id:'invite-id',recipientName:'maeling',status:'accepted',matchId:'match-id'});
 assert.equal(accepted.path,matchShare('match-id').path);assert.match(accepted.description,/players who joined/);
});
class Element {
 children:Element[]=[];attributes=new Map<string,string>();textContent='';className='';type='';innerHTML='';value='';readOnly=false;open=false;removed=false;focused=false;selected=false;onclick?:()=>void;events=new Map<string,()=>void>();
 append(...children:Element[]){this.children.push(...children)}setAttribute(name:string,value:string){this.attributes.set(name,value)}
 addEventListener(name:string,callback:()=>void){this.events.set(name,callback)}showModal(){this.open=true}close(){this.open=false;this.events.get('close')?.()}remove(){this.removed=true}focus(){this.focused=true}select(){this.selected=true}
 find(text:string):Element|undefined{return this.textContent===text?this:this.children.map(c=>c.find(text)).find(Boolean)}
}
test('share window supports native sharing, copy fallback, cancellation and reopening',async()=>{
 const names=['document','location','navigator','HTMLElement'] as const,previous=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
 const body=new Element(),focus=new Element(),copies:string[]=[],shares:any[]=[];
 const navigator:any={clipboard:{writeText:async(value:string)=>{copies.push(value)}}};
 try{
  const globals={document:{body,activeElement:focus,createElement:()=>new Element()},location:{origin:'https://picklebash.app'},navigator,HTMLElement:Element};
  for(const name of names)Object.defineProperty(globalThis,name,{configurable:true,value:globals[name]});
  const dialog=showGameShare(matchShare('match-id')) as unknown as Element;
  assert.equal(dialog.open,true);dialog.find('Copy Link')!.onclick!();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(copies[0],'https://picklebash.app/?multiplayer=1&match=match-id');
  const button=dialog.children.find(c=>c.className==='friend-share-actions')!.children[1];
  button.onclick!();await new Promise(resolve=>setImmediate(resolve));assert.equal(copies.length,2);
  navigator.share=async(value:unknown)=>{shares.push(value);};button.onclick!();await new Promise(resolve=>setImmediate(resolve));assert.equal(shares[0].url,copies[0]);
  navigator.share=async()=>{throw new DOMException('Cancelled','AbortError')};button.onclick!();await new Promise(resolve=>setImmediate(resolve));assert.equal(copies.length,2);
  dialog.close();assert.equal(dialog.removed,true);assert.equal(focus.focused,true);
  const reopened=showGameShare(matchShare('match-id')) as unknown as Element;assert.equal(reopened.open,true);
 }finally{names.forEach((name,index)=>{if(previous[index])Object.defineProperty(globalThis,name,previous[index]!);else Reflect.deleteProperty(globalThis,name);});}
});
