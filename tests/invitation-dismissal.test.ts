import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync('src/multiplayer/remote-main.ts','utf8');
const start=source.indexOf("for(const [buttonId,action] of [['remote-decline'");
const end=source.indexOf("\nel('remote-accept').onclick",start);
const handlers=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('closing an invitation removes its card before refresh and clears the response guard',async()=>{
 for(const action of ['cancel','decline','delete']){
  const buttons=new Map<string,any>(),events:string[]=[];
  let finishRefresh!:()=>void;
  const refresh=new Promise<void>(resolve=>{finishRefresh=resolve;});
  const context:any={
   selectedInvite:{id:'closed'},accepting:false,account:'owner',invitations:[{id:'closed'},{id:'keep'}],
   el:(id:string)=>{if(!buttons.has(id))buttons.set(id,{disabled:false});return buttons.get(id);},
   matchCredentials:async()=>({owner:'owner',token:'token'}),
   remoteRequest:async(_token:string,path:string)=>{assert.equal(path,`/api/invitations/closed/${action}`);},
   renderInvitations:()=>events.push('invitations'),renderGames:()=>events.push('games'),
   lobby:async()=>{assert.equal(context.accepting,false,'refresh is no longer blocked');assert.deepEqual(Array.from(context.invitations,(i:any)=>i.id),['keep']);events.push('lobby');await refresh;},
   status:(message:string)=>events.push(message),window:{scrollTo(){}},focusView(){}
  };
  vm.runInNewContext(handlers,context);
  buttons.get(action==='cancel'?'remote-cancel-invite':action==='decline'?'remote-decline':'remote-delete-invite').onclick();
  await settle();
  assert.deepEqual(events,['invitations','games','lobby'],'card disappears while refresh is still pending');
  finishRefresh();await settle();
  assert.equal(context.accepting,false);assert.equal(buttons.get('remote-accept').disabled,false);
 }
});

test('failed cancellation keeps the invitation available and restores controls',async()=>{
 const buttons=new Map<string,any>(),messages:string[]=[];
 const context:any={selectedInvite:{id:'keep'},accepting:false,account:'owner',invitations:[{id:'keep'}],
  el:(id:string)=>{if(!buttons.has(id))buttons.set(id,{disabled:false});return buttons.get(id);},
  matchCredentials:async()=>({owner:'owner',token:'token'}),remoteRequest:async()=>{throw Error('Try again');},
  renderInvitations:()=>assert.fail('failed cancellation must preserve the list'),renderGames:()=>assert.fail(),lobby:()=>assert.fail(),
  status:(message:string)=>messages.push(message),window:{scrollTo(){}},focusView(){}
 };
 vm.runInNewContext(handlers,context);buttons.get('remote-cancel-invite').onclick();await settle();
 assert.deepEqual(messages,['Try again']);assert.equal(context.invitations.length,1);
 assert.equal(context.accepting,false);assert.equal(buttons.get('remote-cancel-invite').disabled,false);
});

test('both invitation exits return immediately even when lobby refresh is pending',()=>{
 const buttons=new Map<string,any>(),events:string[]=[];
 const context={el:(id:string)=>{if(!buttons.has(id))buttons.set(id,{});return buttons.get(id);},
  lobby:()=>{events.push('lobby');return new Promise(()=>{});},status(){},
  window:{scrollTo:()=>events.push('scroll')},focusView:()=>events.push('focus')};
 vm.runInNewContext(handlers,context);
 for(const id of ['remote-invite-back','remote-invite-games']){events.length=0;buttons.get(id).onclick();assert.deepEqual(events,['lobby','scroll','focus']);}
});
