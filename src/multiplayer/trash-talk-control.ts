import {focusView} from '../view-focus';
import {hudButtonIcon} from '../hud-button';
import type {CourtScene} from '../scene';
import type {GameState,PlayerId} from '../engine/model';
export interface ReactionMatch {id:string;version:number}
import type {Credentials,Transport} from './match-session';
import {remoteRequest} from './api';
import {browserStorage} from '../browser-storage';
import {sounds} from '../sound';
import {CHAT_LIMIT,CHAT_DURATION,CHAT_COOLDOWN,TRASH_TALK_OPTIONS,replayTrashTalk,type TrashTalk,type TrashTalkFeed} from './trash-talk';
import './trash-talk.css';
export class TrashTalkControl {
 private host=document.createElement('div');
 private toggle:HTMLButtonElement;private panel:HTMLFormElement;private input:HTMLInputElement;private hint:HTMLElement;private count:HTMLElement;private recentHost:HTMLElement;
 private match:ReactionMatch|null=null;private owner='';private generation=0;private fetching=false;private sending=false;private checkedAt=0;private cooldown=0;
 private messages:TrashTalk[]=[];private live=new Map<PlayerId,{message:TrashTalk;until:number}>();private seen=new Set<string>();private sounded=new Set<string>();private bubbles=new Map<PlayerId,HTMLElement>();
 private muted=browserStorage.getItem('pickle-trash-talk-muted')==='true';
 private recent:string[]=[];
 private pending:{id:string;text:string}|null=null;
 get isOpen(){return this.host.classList.contains('is-open')}
 constructor(court:HTMLElement,settings:HTMLElement,private credentials:()=>Promise<Credentials>,private clearTarget:()=>void,private request:Transport=remoteRequest){
  this.host.className='trash-talk';this.host.dataset.sound='none';this.host.innerHTML=`<button type="button" class="trash-toggle" aria-label="Reactions" title="Reactions" aria-expanded="false" aria-controls="trash-panel">${hudButtonIcon('reactions')}</button><form id="trash-panel" class="trash-panel" inert aria-label="Reactions"><div class="trash-options"></div><div class="trash-recents" aria-label="Recent messages" hidden></div><div class="trash-entry"><input aria-label="Short message" placeholder="Talk your game…" autocomplete="off" maxlength="${CHAT_LIMIT*2}"><button type="submit" aria-label="Send message" title="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-6-8-2Z"/><path d="m12 14 8-10"/></svg></button></div><div class="trash-footer"><span role="status" aria-live="polite"></span><small>0 / ${CHAT_LIMIT}</small></div></form>`;
  court.append(this.host);this.toggle=this.host.querySelector('.trash-toggle')!;this.panel=this.host.querySelector('form')!;this.input=this.host.querySelector('input')!;this.hint=this.host.querySelector('[role="status"]')!;this.count=this.host.querySelector('small')!;this.recentHost=this.host.querySelector('.trash-recents')!;
  for(const phrase of TRASH_TALK_OPTIONS){const b=document.createElement('button');b.type='button';b.textContent=phrase;b.onclick=()=>void this.send(phrase);this.host.querySelector('.trash-options')!.append(b);}
  this.toggle.onclick=()=>this.open(!this.isOpen);
  document.addEventListener('pointerdown',event=>{if(this.isOpen&&!this.host.contains(event.target as Node)){event.preventDefault();event.stopPropagation();this.open(false)}},true);
  this.panel.onsubmit=e=>{e.preventDefault();void this.send(this.input.value,true)};
  this.input.oninput=()=>{this.input.value=[...this.input.value].slice(0,CHAT_LIMIT).join('');this.count.textContent=`${[...this.input.value].length} / ${CHAT_LIMIT}`;this.pending=null;};
  this.host.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.open(false)}});
  const label=document.createElement('label');label.className='settings-toggle settings-reactions-toggle';label.innerHTML='<span>Mute reactions<small>Hide message bubbles, including in replay.</small></span><input type="checkbox" role="switch">';
  const mute=label.querySelector('input')!;mute.checked=this.muted;mute.onchange=()=>{this.muted=mute.checked;browserStorage.setItem('pickle-trash-talk-muted',String(this.muted))};const names=settings.querySelector('#remote-names')?.closest('label');if(names)names.after(label);else settings.append(label);
  this.host.hidden=true;
 }
 private open(value:boolean){this.host.classList.toggle('is-open',value);this.panel.inert=!value;this.toggle.setAttribute('aria-expanded',String(value));if(value){this.clearTarget();this.input.focus()}else focusView();}
 private recentKey(){return `pickle-trash-talk-recents:${this.owner}`}
 private loadRecent(){
  try{const value=JSON.parse(browserStorage.getItem(this.recentKey())??'[]');this.recent=Array.isArray(value)?value.filter((text):text is string=>typeof text==='string'&&[...text].length>0&&[...text].length<=CHAT_LIMIT&&!TRASH_TALK_OPTIONS.includes(text)).filter((text,index,list)=>list.indexOf(text)===index).slice(0,3):[]}catch{this.recent=[]}
  this.renderRecent();
 }
 private renderRecent(){
  this.recentHost.replaceChildren();this.recentHost.hidden=!this.recent.length;
  for(const text of this.recent){const button=document.createElement('button');button.type='button';button.textContent=text;button.title=text;button.onclick=()=>void this.send(text);this.recentHost.append(button)}
 }
 private remember(text:string){
  if(!text||TRASH_TALK_OPTIONS.includes(text))return;
  this.recent=[text,...this.recent.filter(item=>item!==text)].slice(0,3);browserStorage.setItem(this.recentKey(),JSON.stringify(this.recent));this.renderRecent();
 }
 reset(){this.generation++;this.match=null;this.owner='';this.messages=[];this.seen.clear();this.sounded.clear();this.live.clear();this.pending=null;this.fetching=false;this.sending=false;this.cooldown=0;this.checkedAt=0;this.input.value='';this.count.textContent=`0 / ${CHAT_LIMIT}`;this.hint.textContent='';this.host.classList.remove('is-open');this.panel.inert=true;this.toggle.setAttribute('aria-expanded','false');this.host.hidden=true;for(const b of this.bubbles.values())b.hidden=true;}
 update(match:ReactionMatch|null,owner:string){const ownerChanged=owner!==this.owner;if(match?.id!==this.match?.id||ownerChanged)this.reset();if(match?.version!==this.match?.version)this.checkedAt=0;this.match=match;this.owner=owner;if(ownerChanged)this.loadRecent();this.host.hidden=!match;}
 private accept(feed:TrashTalkFeed){
  this.messages=feed.messages;
  const now=performance.now(),serverNow=Date.parse(feed.serverTime);
  for(const message of feed.messages){if(this.seen.has(message.id))continue;this.seen.add(message.id);const remaining=CHAT_DURATION-Math.max(0,serverNow-Date.parse(message.createdAt));if(remaining>0)this.live.set(message.player,{message,until:now+remaining});}
  // Only the current feed can ever be shown again; keep memory bounded across turns.
  this.seen=new Set(feed.messages.map(m=>m.id));
 }
 private async refresh(){const match=this.match,owner=this.owner,generation=this.generation;if(!match||this.fetching)return;this.fetching=true;this.checkedAt=performance.now();
  try{const c=await this.credentials();if(c.owner!==owner)return;const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/trash-talk`);if(generation===this.generation)this.accept(feed);}catch{/* Sending exposes actionable errors; background polling stays quiet. */}finally{if(generation===this.generation)this.fetching=false;}
 }
 private async send(text:string,remember=false){const match=this.match,owner=this.owner,generation=this.generation;if(!match||this.sending)return;
  if(performance.now()<this.cooldown){this.hint.textContent='Give it three seconds between messages.';return;}if(!text.trim())return;
  const message=this.pending?.text===text?this.pending:{id:crypto.randomUUID(),text};this.pending=message;this.sending=true;this.hint.textContent='Sending…';
  try{const c=await this.credentials();if(c.owner!==owner)throw Error('Account changed. Reopen the match.');const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/trash-talk`,message);if(generation!==this.generation)return;this.accept(feed);const delivered=feed.messages.find(item=>item.id===message.id)?.text??message.text.trim();if(remember)this.remember(delivered);this.cooldown=performance.now()+CHAT_COOLDOWN;this.pending=null;this.input.value='';this.count.textContent=`0 / ${CHAT_LIMIT}`;this.hint.textContent='';this.open(false);}
  catch(e){if(generation===this.generation)this.hint.textContent=(e as Error).message;}finally{if(generation===this.generation)this.sending=false;}
 }
 frame(scene:CourtScene,state:GameState,replayTime:number|null,visible:boolean,replayMessages?:TrashTalk[]){
  if(visible&&!document.hidden&&performance.now()-this.checkedAt>1500)void this.refresh();
  this.host.hidden=!visible||replayTime!==null;
  const messages=replayTime===null?[...this.live.values()].filter(v=>v.until>performance.now()).map(v=>v.message):replayMessages??replayTrashTalk(this.messages,this.match?.version??0,replayTime);
  for(const b of this.bubbles.values())b.hidden=true;
  if(this.muted||!visible)return;
  for(const message of messages){const player=state.players.find(p=>p.id===message.player);if(!player)continue;const p=scene.projectSpeech(player.position);if(!p.visible)continue;
   let b=this.bubbles.get(message.player);if(!b){b=document.createElement('div');b.className='trash-bubble';b.setAttribute('role','status');this.host.parentElement!.append(b);this.bubbles.set(message.player,b);}if(b.textContent!==message.text)b.textContent=message.text;b.classList.toggle('is-emoji',TRASH_TALK_OPTIONS.includes(message.text));b.hidden=false;b.style.left=`${p.x}px`;b.style.top=`${p.y}px`;if(!this.sounded.has(message.id)){this.sounded.add(message.id);sounds.play('select')}
  }
 }
}
