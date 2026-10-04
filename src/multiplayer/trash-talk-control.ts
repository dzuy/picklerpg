import {focusView} from '../view-focus';
import {hudButtonIcon} from '../hud-button';
import {openPlayerSafety} from '../account-safety';
import type {MatchRivalry} from './rivalry';
import type {CourtScene} from '../scene';
import type {GameState,PlayerId} from '../engine/model';
import type {Credentials,Transport} from './match-session';
import {remoteRequest} from './api';
import {browserStorage} from '../browser-storage';
import {playerId} from '../player-design';
import {sounds} from '../sound';
import {CHAT_LIMIT,CHAT_DURATION,CHAT_COOLDOWN,TRASH_TALK_OPTIONS,chatPreview,replayTrashTalk,reactionReplayDuration,type TrashTalk,type TrashTalkFeed,type ChatCursor} from './trash-talk';
import './trash-talk.css';
export interface ReactionMatch {id:string;version:number;accountIds?:{home:string|null;away:string|null};rivalry?:MatchRivalry}
let panelSequence=0;
export class TrashTalkControl {
 private host=document.createElement('div');
 private toggle:HTMLButtonElement;private panel:HTMLElement;private input:HTMLInputElement;private hint:HTMLElement;private count:HTMLElement;private history:HTMLElement;private older:HTMLButtonElement;private title:HTMLElement;private muteButton:HTMLButtonElement;private blockButton:HTMLButtonElement;private safety:HTMLElement;private safetyToggle:HTMLButtonElement;private entry:HTMLFormElement;
 private match:ReactionMatch|null=null;private owner='';private generation=0;private fetching=false;private sending=false;private loadingOlder=false;private checkedAt=0;private cooldown=0;
 private messages:TrashTalk[]=[];private replayMessages:TrashTalk[]=[];private live=new Map<PlayerId,{message:TrashTalk;until:number}>();private seen=new Set<string>();private sounded=new Set<string>();private bubbles=new Map<PlayerId,HTMLButtonElement>();
 private globalMuted=browserStorage.getItem('pickle-trash-talk-muted')==='true';private muted=false;private blocked=false;private blockedByYou=false;private loaded=false;private nextCursor:ChatCursor|null=null;private selectedMessage:string|null=null;private unread=0;
 private pending:{id:string;text:string}|null=null;
 private revision=0;
 private courtRect:DOMRect|null=null;private viewportHeight=0;
 get isOpen(){return this.host.classList.contains('is-open')}
 constructor(private court:HTMLElement,settings:HTMLElement,private credentials:()=>Promise<Credentials>,private clearTarget:()=>void,private request:Transport=remoteRequest){
  const panelId=`player-chat-${++panelSequence}`;
  this.host.className='trash-talk ph-no-capture';this.host.dataset.sound='none';this.host.innerHTML=`<button type="button" class="trash-toggle" aria-label="Open chat" title="Chat" aria-expanded="false" aria-controls="${panelId}">${hudButtonIcon('reactions')}<span class="trash-unread" hidden></span></button><section id="${panelId}" class="trash-panel" inert aria-label="Match chat"><header class="trash-header"><span class="trash-handle" aria-hidden="true"></span><div><strong>Chat</strong><small class="trash-subtitle"></small></div><button type="button" class="trash-close" aria-label="Close chat">×</button></header><button type="button" class="trash-older" hidden>Load earlier messages</button><div class="trash-history" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions"></div><div class="trash-options" aria-label="Quick reactions"></div><div class="trash-footer"><span role="status" aria-live="polite"></span><small>0 / ${CHAT_LIMIT}</small></div><form class="trash-entry"><button type="button" class="trash-safety-toggle" aria-label="Chat safety options" aria-expanded="false" aria-controls="${panelId}-safety"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0c5-5 9 5 14 0v10c-5 5-9-5-14 0Z"/></svg></button><div id="${panelId}-safety" class="trash-safety" role="group" aria-label="Chat safety options" hidden><button type="button" data-action="mute">Mute</button><button type="button" data-action="block">Block</button><button type="button" data-action="report">Report</button><a href="mailto:dzuy@automaticalabs.com">Contact</a></div><input aria-label="Message" placeholder="Talk your game…" autocomplete="off" maxlength="${CHAT_LIMIT*2}" enterkeyhint="send"><button type="submit" class="trash-send" aria-label="Send message" title="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-6-8-2Z"/><path d="m12 14 8-10"/></svg></button></form></section>`;
  court.append(this.host);this.toggle=this.host.querySelector('.trash-toggle')!;this.panel=this.host.querySelector('.trash-panel')!;this.entry=this.host.querySelector('form')!;this.input=this.host.querySelector('input')!;this.hint=this.host.querySelector('[role="status"]')!;this.count=this.host.querySelector('.trash-footer small')!;this.history=this.host.querySelector('.trash-history')!;this.older=this.host.querySelector('.trash-older')!;this.title=this.host.querySelector('strong')!;this.muteButton=this.host.querySelector('[data-action="mute"]')!;this.blockButton=this.host.querySelector('[data-action="block"]')!;this.safety=this.host.querySelector('.trash-safety')!;this.safetyToggle=this.host.querySelector('.trash-safety-toggle')!;
  this.safetyToggle.onclick=()=>this.openSafety(this.safety.hidden);
  this.safety.addEventListener('click',()=>this.openSafety(false));
  this.host.addEventListener('pointerdown',e=>{if(!this.safety.hidden&&!(e.target as Element).closest('.trash-safety,.trash-safety-toggle'))this.openSafety(false)});
  for(const phrase of TRASH_TALK_OPTIONS){const b=document.createElement('button');b.type='button';b.textContent=phrase;b.setAttribute('aria-label',`Send ${phrase}`);b.onclick=()=>void this.send(phrase);this.host.querySelector('.trash-options')!.append(b);}
  this.toggle.onclick=()=>this.open(!this.isOpen);this.host.querySelector<HTMLButtonElement>('.trash-close')!.onclick=()=>this.open(false);
  document.addEventListener('pointerdown',event=>{if(this.isOpen&&!this.host.contains(event.target as Node)&&!((event.target as Element).closest('dialog,.trash-bubble'))){event.preventDefault();event.stopPropagation();this.open(false)}},true);
  this.entry.addEventListener('pointerdown',e=>{if((e.target as Element).closest('button')&&document.activeElement===this.input)e.preventDefault();});
  this.entry.onsubmit=e=>{e.preventDefault();void this.send(this.input.value)};
  this.input.oninput=()=>{this.input.value=[...this.input.value].slice(0,CHAT_LIMIT).join('');this.count.textContent=`${[...this.input.value].length} / ${CHAT_LIMIT}`;this.pending=null;};
  this.input.onfocus=()=>{this.viewportHeight=window.visualViewport?.height??window.innerHeight;this.layout()};
  this.input.onblur=()=>{this.host.classList.remove('keyboard-open');this.layout()};
  window.visualViewport?.addEventListener('resize',()=>this.layout());window.visualViewport?.addEventListener('scroll',()=>this.layout());window.addEventListener('resize',()=>this.layout());
  this.host.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(!this.safety.hidden){this.openSafety(false);this.safetyToggle.focus()}else this.open(false)}});
  let touchY=0;const header=this.host.querySelector<HTMLElement>('header')!;header.addEventListener('pointerdown',e=>{if((e.target as Element).closest('button'))return;touchY=e.clientY;header.setPointerCapture(e.pointerId)});header.addEventListener('pointerup',e=>{if(e.clientY-touchY>45)this.open(false)});
  this.older.onclick=()=>void this.loadOlder();this.muteButton.onclick=()=>void this.setMuted();this.blockButton.onclick=()=>void this.setBlocked();
  this.host.querySelector<HTMLButtonElement>('[data-action="report"]')!.onclick=()=>{const generation=this.generation;if(this.match)openPlayerSafety({matchId:this.match.id,...(this.selectedMessage?{messageId:this.selectedMessage}:{})},this.title.textContent??'opponent',()=>{if(generation===this.generation)this.hideBlockedReactions()});};
  const label=document.createElement('label');label.className='settings-toggle settings-reactions-toggle';label.innerHTML='<span>Mute all chat bubbles<small>Hide message bubbles and sounds, including in replay.</small></span><input type="checkbox" role="switch">';
  const mute=label.querySelector('input')!;mute.checked=this.globalMuted;mute.onchange=()=>{this.globalMuted=mute.checked;browserStorage.setItem('pickle-trash-talk-muted',String(this.globalMuted))};const names=settings.querySelector('#remote-names')?.closest('label');if(names)names.after(label);else settings.append(label);
  this.host.hidden=true;
 }
 private openSafety(value:boolean){this.safety.hidden=!value;this.safetyToggle.setAttribute('aria-expanded',String(value));}
 private layout(){
  if(!this.isOpen)return;const vv=window.visualViewport;const keyboard=document.activeElement===this.input&&!!vv&&this.viewportHeight-vv.height>80;
  if(!keyboard)this.courtRect=this.court.getBoundingClientRect();const rect=this.courtRect??this.court.getBoundingClientRect();
  this.panel.style.left=`${rect.left}px`;this.panel.style.top=`${rect.top+rect.height*.4}px`;this.panel.style.width=`${rect.width}px`;this.panel.style.height=`${rect.height*.6}px`;
  this.host.classList.toggle('keyboard-open',keyboard);
  if(keyboard){this.entry.style.setProperty('--chat-input-top',`${vv!.offsetTop+vv!.height-56}px`);this.entry.style.setProperty('--chat-input-left',`${rect.left}px`);this.entry.style.setProperty('--chat-input-width',`${rect.width}px`);}
 }
 hideBlockedReactions(){this.revision++;this.blocked=true;this.blockedByYou=true;this.live.clear();this.messages=[];this.replayMessages=[];for(const b of this.bubbles.values())b.hidden=true;this.render();}
 private open(value:boolean){this.openSafety(false);this.host.classList.toggle('is-open',value);this.panel.inert=!value;this.toggle.setAttribute('aria-expanded',String(value));if(value){this.clearTarget();this.unread=0;this.updateBadge();this.layout();this.host.querySelector<HTMLButtonElement>('.trash-close')!.focus({preventScroll:true});this.history.scrollTop=this.history.scrollHeight;void this.refresh();}else{this.input.blur();this.host.classList.remove('keyboard-open');focusView();}}
 reset(){this.openSafety(false);this.safetyToggle.hidden=true;this.title.textContent='Chat';delete this.history.dataset.signature;this.generation++;this.match=null;this.owner='';this.messages=[];this.replayMessages=[];this.seen.clear();this.sounded.clear();this.live.clear();this.pending=null;this.fetching=false;this.sending=false;this.muteButton.disabled=false;this.blockButton.disabled=false;this.loadingOlder=false;this.cooldown=0;this.checkedAt=0;this.loaded=false;this.muted=false;this.blocked=false;this.blockedByYou=false;this.nextCursor=null;this.selectedMessage=null;this.unread=0;this.input.value='';this.count.textContent=`0 / ${CHAT_LIMIT}`;this.hint.textContent='';this.input.blur();this.host.classList.remove('is-open','keyboard-open');this.panel.inert=true;this.toggle.setAttribute('aria-expanded','false');this.host.hidden=true;this.history.replaceChildren();this.updateBadge();for(const b of this.bubbles.values())b.hidden=true;}
 update(match:ReactionMatch|null,owner:string){if(match?.id!==this.match?.id||owner!==this.owner)this.reset();if(match?.version!==this.match?.version)this.checkedAt=0;this.match=match;this.owner=owner;this.host.hidden=!match;const record=match?.rivalry?.current;const text=record? `Your record: ${record.wins} ${record.wins===1?'win':'wins'} · ${record.losses} ${record.losses===1?'loss':'losses'}`:match?.rivalry?'Your record: 0 wins · 0 losses':'Match history unavailable';const subtitle=this.host.querySelector('.trash-subtitle')!;if(subtitle.textContent!==text)subtitle.textContent=text;}
 private updateBadge(){const badge=this.host.querySelector<HTMLElement>('.trash-unread')!;badge.hidden=!this.unread;badge.textContent=this.unread>9?'9+':String(this.unread);}
 private accept(feed:TrashTalkFeed,older=false){
  const now=performance.now(),serverNow=Date.parse(feed.serverTime),initial=!this.loaded;
  this.muted=feed.muted??this.muted;this.blocked=feed.blocked??false;this.blockedByYou=feed.blockedByYou??false;
  if(!older){this.replayMessages=feed.replayMessages??feed.messages;this.title.textContent=feed.opponentName??'Court chat';this.safetyToggle.hidden=!feed.conversationId;if(!feed.conversationId)this.openSafety(false);}
  if(older||initial)this.nextCursor=feed.nextCursor??null;
  if(this.blocked){this.messages=[];this.replayMessages=[];this.live.clear();this.selectedMessage=null;this.unread=0;}
  else {
   const combined=new Map(this.messages.map(m=>[m.id,m]));for(const message of feed.messages)combined.set(message.id,message);
   this.messages=[...combined.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id));
   for(const message of feed.messages){
    if(this.seen.has(message.id))continue;this.seen.add(message.id);
    const remaining=CHAT_DURATION-Math.max(0,serverNow-Date.parse(message.createdAt));
    if(!older&&remaining>0&&(!message.matchId||message.matchId===this.match?.id))this.live.set(message.player,{message,until:now+remaining});
    if(!initial&&!older&&!this.isOpen&&!this.muted&&!this.blocked&&message.senderId&&message.senderId!==this.owner)this.unread++;
   }
  }
  this.loaded=true;this.render();this.updateBadge();
 }
 private render(){
  const bottom=this.history.scrollHeight-this.history.scrollTop-this.history.clientHeight<48;const scroll=this.history.scrollTop;
  // Keep unchanged history nodes so polling does not repeatedly announce the entire log.
  const signature=this.messages.map(m=>m.id).join(',')+`|${this.selectedMessage}|${this.blocked}|${this.loaded}`;
  if(this.history.dataset.signature!==signature){
   this.history.dataset.signature=signature;this.history.replaceChildren();
   if(!this.messages.length){const empty=document.createElement('p');empty.className='trash-empty';empty.textContent=this.blocked?'Messages are unavailable for this player.':this.loaded?'Bring your best game. And your best banter.':'Loading conversation…';this.history.append(empty);}
   for(const m of this.messages){
    const mine=m.senderId?m.senderId===this.owner:m.player==='you'||m.player==='partner';const row=document.createElement('div');row.className=`trash-message ${mine?'is-mine':'is-theirs'}`;
    const text=document.createElement('button');text.type='button';text.className='trash-message-text';text.textContent=m.text;
    if(!mine&&m.senderId){text.setAttribute('aria-label',`${m.text}. Select message to report`);text.setAttribute('aria-pressed',String(m.id===this.selectedMessage));text.onclick=()=>{this.selectedMessage=this.selectedMessage===m.id?null:m.id;this.hint.textContent=this.selectedMessage?'Message selected. Open the red flag menu to report.':'';this.render();};}else{text.tabIndex=-1;}
    const time=document.createElement('time');time.dateTime=m.createdAt;time.textContent=new Date(m.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});row.append(text,time);this.history.append(row);
   }
   this.history.scrollTop=bottom?this.history.scrollHeight:scroll;
  }
  this.older.hidden=!this.nextCursor||this.blocked;this.older.disabled=this.loadingOlder;this.muteButton.textContent=this.muted?'Unmute':'Mute';this.muteButton.setAttribute('aria-pressed',String(this.muted));this.blockButton.textContent=this.blockedByYou?'Unblock':'Block';
  this.input.disabled=this.blocked;for(const b of Array.from(this.host.querySelectorAll<HTMLButtonElement>('.trash-options button,.trash-send')))b.disabled=this.blocked;
 }
 private async refresh(){const match=this.match,owner=this.owner,generation=this.generation,revision=this.revision;if(!match||this.fetching||this.sending||this.muteButton?.disabled||this.blockButton?.disabled)return;this.fetching=true;this.checkedAt=performance.now();
  try{const c=await this.credentials();if(c.owner!==owner||generation!==this.generation)return;const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/trash-talk`);if(generation===this.generation&&revision===this.revision){this.accept(feed);if(this.hint.dataset.loadError){this.hint.textContent='';delete this.hint.dataset.loadError;}}}catch{if(generation===this.generation&&this.isOpen){this.hint.textContent='Could not load messages. Retrying…';this.hint.dataset.loadError='true';}}finally{if(generation===this.generation)this.fetching=false;}
 }
 private async loadOlder(){const match=this.match,cursor=this.nextCursor,generation=this.generation,revision=this.revision;if(!match||!cursor||this.loadingOlder)return;this.loadingOlder=true;this.older.disabled=true;
  try{const c=await this.credentials();if(c.owner!==this.owner||generation!==this.generation)return;const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/trash-talk?beforeTime=${encodeURIComponent(cursor.time)}&beforeId=${cursor.id}`);if(generation!==this.generation||revision!==this.revision)return;const height=this.history.scrollHeight,top=this.history.scrollTop;this.accept(feed,true);this.history.scrollTop=top+this.history.scrollHeight-height;}catch(e){if(generation===this.generation)this.hint.textContent=(e as Error).message;}finally{if(generation===this.generation){this.loadingOlder=false;this.older.disabled=false;}}
 }
 private async setMuted(){const match=this.match,generation=this.generation;if(!match)return;const revision=++this.revision;this.muteButton.disabled=true;
  try{const c=await this.credentials();if(c.owner!==this.owner||generation!==this.generation)return;const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/chat-preferences`,{muted:!this.muted});if(generation===this.generation&&revision===this.revision){this.accept(feed);this.live.clear();this.hint.textContent=this.muted?'Bubbles and sounds muted. You can still read messages here.':'Chat unmuted.';}}catch(e){if(generation===this.generation)this.hint.textContent=(e as Error).message;}finally{if(generation===this.generation)this.muteButton.disabled=false;}
 }
 private async setBlocked(){const match=this.match,generation=this.generation;if(!match)return;++this.revision;this.blockButton.disabled=true;
  try{const c=await this.credentials();if(c.owner!==this.owner||generation!==this.generation)return;await this.request(c.token,'/api/multiplayer/safety/block',{matchId:match.id,blocked:!this.blockedByYou});if(generation===this.generation){this.revision++;if(!this.blockedByYou)this.hideBlockedReactions();else{this.blockedByYou=false;this.loaded=false;this.seen.clear();this.checkedAt=0;}this.hint.textContent=this.blockedByYou?'Player blocked. Messages and new invitations are disabled.':'Player unblocked.';}}catch(e){if(generation===this.generation)this.hint.textContent=(e as Error).message;}finally{if(generation===this.generation)this.blockButton.disabled=false;}
 }
 private async send(text:string){const match=this.match,owner=this.owner,generation=this.generation;if(!match||this.sending||this.blocked)return;
  if(performance.now()<this.cooldown){this.hint.textContent='Give it three seconds between messages.';return;}if(!text.trim())return;
  const revision=++this.revision;this.sending=true;this.hint.textContent='Sending…';
  try{const message=this.pending?.text===text?this.pending:{id:playerId(),text};this.pending=message;const c=await this.credentials();if(generation!==this.generation||this.blocked)return;if(c.owner!==owner)throw Error('Account changed. Reopen the match.');const feed=await this.request<TrashTalkFeed>(c.token,`/api/matches/${match.id}/trash-talk`,message);if(generation!==this.generation)return;if(revision===this.revision)this.accept(feed);this.cooldown=performance.now()+CHAT_COOLDOWN;this.pending=null;if(this.input.value===text){this.input.value='';this.count.textContent=`0 / ${CHAT_LIMIT}`;}this.hint.textContent='';this.history.scrollTop=this.history.scrollHeight;}
  catch(e){if(generation===this.generation)this.hint.textContent=(e as Error).message;}finally{if(generation===this.generation)this.sending=false;}
 }
 replayDuration(version:number,contactTime:number){return reactionReplayDuration(this.replayMessages,version,contactTime)}
 frame(scene:CourtScene,state:GameState,replayTime:number|null,visible:boolean,replayMessages?:TrashTalk[],replayContext?:{version:number;contactTime:number}){
  if(visible&&!document.hidden&&performance.now()-this.checkedAt>1500)void this.refresh();
  // Replay owns the bottom controls; its close button must never hit chat underneath.
  const chatVisible=visible&&replayTime===null;if(!chatVisible&&this.isOpen)this.open(false);this.host.hidden=!chatVisible;
  const messages=replayTime===null?[...this.live.values()].filter(v=>v.until>performance.now()).map(v=>v.message):replayMessages??replayTrashTalk(this.replayMessages,replayContext?.version??this.match?.version??0,replayTime,replayContext?.contactTime??0);
  for(const b of this.bubbles.values())b.hidden=true;
  if(this.globalMuted||this.muted||this.blocked||!visible||this.isOpen)return;
  for(const message of messages){const player=state.players.find(p=>p.id===message.player);if(!player)continue;const p=scene.projectSpeech(player.position);if(!p.visible)continue;
   let b=this.bubbles.get(message.player);if(!b){b=document.createElement('button');b.type='button';b.className='trash-bubble ph-no-capture';b.onclick=e=>{e.stopPropagation();this.open(true)};this.court.append(b);this.bubbles.set(message.player,b);}b.disabled=replayTime!==null;b.textContent=chatPreview(message.text);b.setAttribute('aria-label',`${chatPreview(message.text)}. Open chat`);b.classList.toggle('is-emoji',TRASH_TALK_OPTIONS.includes(message.text));b.hidden=false;b.style.left=`${p.x}px`;b.style.top=`${p.y}px`;if(!this.sounded.has(message.id)){this.sounded.add(message.id);sounds.play('select')}
  }
 }
}
