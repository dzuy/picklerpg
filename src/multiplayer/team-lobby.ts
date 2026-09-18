import {activityTitle,activityPanel} from './activity-badges';
import type {ActivityRewards} from '../activity-rewards';
import {openGameSurface} from '../game-surface';
import {appNavigation,initialLobbyPage,type LobbyPage} from '../app-navigation';
import {profilePanel} from './profile';
import {AvatarThumbnails} from '../avatar-preview';
import {preloadAthletes} from '../athlete';
import {authClient,matchCredentials} from '../auth-session';
import {remoteRequest} from './api';
import type {profileRecord} from '../profile-record';
import type {LobbyTeam,TeamDirectory} from './team-directory';
import './team-lobby.css';
function node<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;}
export class TeamLobby {
 readonly element=node('section','team-lobby');
 private static activeTab:'games'|'friends'|'community'|'roster'|'profile'=initialLobbyPage()==='friends'&&new URLSearchParams(location.search).get('view')==='community'?'community':initialLobbyPage();private get tab(){return TeamLobby.activeTab}private set tab(value:'games'|'friends'|'community'|'roster'|'profile'){TeamLobby.activeTab=value}private static portraits:AvatarThumbnails|undefined;private get portraits(){return TeamLobby.portraits;}
 private static records=new Map<string,{expires:number;value:Promise<(ReturnType<typeof profileRecord>&{activity?:ActivityRewards})>}>();
 private record(person:LobbyTeam){
  const key=`${this.data.self.id}:${person.id}`,cached=TeamLobby.records.get(key);
  if(cached&&cached.expires>Date.now())return cached.value;
  const value=matchCredentials().then(credentials=>remoteRequest<(ReturnType<typeof profileRecord>&{activity?:ActivityRewards})>(credentials.token,`/api/multiplayer/teams/${person.id}/record`));
  const entry={expires:Date.now()+30000,value};TeamLobby.records.set(key,entry);
  void value.catch(()=>{if(TeamLobby.records.get(key)===entry)TeamLobby.records.delete(key);});return value;
 }
 private data:TeamDirectory;private message='';
 constructor(data:TeamDirectory,private actions:{signOut:()=>Promise<void>;authenticate:(signup:boolean,guest:boolean)=>void;roster:()=>void;create:()=>void;challenge:(team:LobbyTeam)=>void;changed:(data:TeamDirectory)=>void;enabled:boolean;games:HTMLElement}){this.data=data;this.draw();void preloadAthletes().then(()=>{TeamLobby.portraits??=new AvatarThumbnails(256);if(this.element.isConnected)this.draw()}).catch(()=>{});}
 selectTab(tab:LobbyPage){
  this.tab=tab;history.replaceState(null,'',tab==='games'?'/?openplay=1':`/?openplay=1&tab=${tab}`);this.draw();
  if(tab==='roster')this.actions.roster();
  else{this.element.querySelector<HTMLElement>(`#lobby-nav-${tab}`)?.focus();window.scrollTo({top:0,behavior:'instant'});}
 }
 private selectFriendsView(view:'friends'|'community'){this.tab=view;history.replaceState(null,'',`/?openplay=1&tab=friends${view==='community'?'&view=community':''}`);this.draw();this.element.querySelector<HTMLElement>(`#friends-tab-${view}`)?.focus({preventScroll:true});}
 private button(text:string,action:()=>void,cls='team-lobby-quiet'){const b=node('button',cls,text);b.type='button';b.onclick=action;return b;}
 private draw(){
  this.element.replaceChildren();this.element.dataset.tab=this.tab;
  const heading=node('div','team-lobby-heading');
  if(this.tab==='profile'||this.tab==='friends'||this.tab==='community')heading.append(node('h1','',this.tab==='profile'?'Profile':'Friends'));
  else {const copy=node('div','team-lobby-heading-copy');copy.append(node('h1','','Open Play'),node('p','','Challenge friends or meet new players.'));heading.append(copy);}
  const nav=appNavigation(this.tab==='community'?'friends':this.tab,(key,href)=>{
   if(key==='home'){location.assign(href);return;}
   this.selectTab(key);
  });
  const grid=node('div','team-lobby-grid'),directory=node('section','team-directory');
  directory.id='team-directory-panel';directory.setAttribute('aria-labelledby',`lobby-nav-${this.tab==='community'?'friends':this.tab}`);
  this.actions.games.hidden=this.tab!=='games';directory.append(this.actions.games);
  if(this.tab==='friends'||this.tab==='community'){
   const tabs=node('div','friends-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Friends views');
   for(const view of ['friends','community'] as const){
    const tab=this.button(view==='friends'?'My Friends':'Community',()=>this.selectFriendsView(view),'friends-tab');
    tab.id=`friends-tab-${view}`;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(this.tab===view));tab.setAttribute('aria-controls','friends-list-panel');tab.tabIndex=this.tab===view?0:-1;
    tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();this.selectFriendsView(event.key==='Home'?'friends':event.key==='End'?'community':view==='friends'?'community':'friends');}};
    tabs.append(tab);
   }
   directory.append(tabs);
   const people=this.data.teams.filter(person=>this.tab==='community'||this.data.friends.includes(person.id));
   const list=node('div','team-directory-list');list.id='friends-list-panel';list.setAttribute('role','tabpanel');list.setAttribute('aria-labelledby',`friends-tab-${this.tab}`);list.tabIndex=0;
   if(!people.length){const empty=node('div','team-directory-empty');empty.append(node('h2','',this.tab==='friends'?'Build your court circle':'The court is open'),node('p','',this.tab==='friends'?'Find players in Community and add them to Friends for your next match.':'Players will appear here as they join. Invite a friend to get a game going.'));empty.append(this.button(this.tab==='friends'?'Explore Community':'Create a Game',()=>{if(this.tab==='friends'){this.selectFriendsView('community')}else this.actions.create()}));list.append(empty);}
   for(const person of people){
    const card=node('article','lobby-person-row'),identity=node('div','lobby-person-identity');
    if(this.portraits){const img=node('img','lobby-person-avatar');img.src=this.portraits.get(person.avatar,'face');img.alt=`${person.manager}'s avatar`;card.append(img);}
    const title=node('h2','');const profile=this.button(person.manager,()=>this.openFriendProfile(person),'lobby-person-name');profile.dataset.personId=person.id;profile.setAttribute('aria-label',`View ${person.manager}’s profile`);title.append(profile);identity.append(title);
    const recordLabel=node('span','lobby-person-record','');title.append(recordLabel);
    void this.record(person).then(record=>{if(record.activity){const badge=activityTitle(record.activity);if(badge)identity.append(badge);}recordLabel.textContent=` (${record.wins.toLocaleString()}-${record.losses.toLocaleString()})`;recordLabel.setAttribute('aria-label',`${record.wins} wins, ${record.losses} losses`);}).catch(()=>{recordLabel.textContent=' (—)';recordLabel.setAttribute('aria-label','Record unavailable');});
    const controls=node('div','lobby-person-actions'),challenge=this.button('Start Game',()=>this.actions.challenge(person),'team-lobby-primary');challenge.disabled=!this.actions.enabled;
    if(!this.data.friends.includes(person.id)){controls.classList.add('has-add-friend');controls.append(this.button('Add Friend',()=>void this.friend(person.id),'team-lobby-add-friend'));}controls.append(challenge);
    card.append(identity,controls);list.append(card);
   }
   directory.append(list);
  }
  if(this.tab==='profile')directory.append(profilePanel(this.portraits,this.actions.authenticate,this.actions.signOut));
  const aside=node('div','team-lobby-header-actions');
  const solo=this.button('Play Solo',()=>openGameSurface(),'team-lobby-primary team-lobby-create');
  const create=this.button('Create a Game',this.actions.create,'team-lobby-primary team-lobby-create');
  aside.append(solo,create);
  grid.append(directory);if(this.tab==='games')heading.append(aside);this.element.append(heading,grid,nav);
  const status=node('p','team-lobby-status',this.message);status.setAttribute('role','status');this.element.append(status);
 }
 private openFriendProfile(person:LobbyTeam){
  const dialog=node('dialog','friend-profile-dialog'),header=node('div','friend-profile-header'),title=node('h2','','Profile');
  title.id='friend-profile-title';dialog.setAttribute('aria-labelledby',title.id);
  const close=this.button('✕',()=>dialog.close(),'friend-profile-close');close.setAttribute('aria-label','Close friend profile');header.append(title,close);
  const panel=node('section','lobby-profile'),avatar=node('img','');avatar.alt=`${person.manager}’s character`;
  const renderAvatar=()=>{try{TeamLobby.portraits??=new AvatarThumbnails(256);avatar.src=this.portraits!.get(person.avatar,'full')}catch{avatar.hidden=true}};
  if(this.portraits)renderAvatar();else void preloadAthletes().then(renderAvatar).catch(()=>{avatar.hidden=true});
  const relationship=node('p',''),actions=node('div','friend-profile-actions'),status=node('p','');status.setAttribute('role','status');
  const stats=node('dl','lobby-profile-stats');stats.setAttribute('aria-busy','true');
  const values=['Games played','Wins','Losses'].map(label=>{const stat=node('div',''),value=node('dd','','—');stat.append(node('dt','',label),value);stats.append(stat);return value;});
  const recordStatus=node('p','lobby-profile-note','Loading game record…');recordStatus.setAttribute('role','status');
  void (async()=>{
   const record=await this.record(person);
   [record.games,record.wins,record.losses].forEach((value,i)=>values[i].textContent=String(value));if(record.activity){const badge=activityTitle(record.activity);if(badge)relationship.after(badge);panel.append(activityPanel(record.activity));}recordStatus.remove();
  })().catch(()=>{recordStatus.textContent='Game record is unavailable right now.';}).finally(()=>stats.setAttribute('aria-busy','false'));
  const play=this.button('Start Game',()=>{dialog.close();this.actions.challenge(person)},'team-lobby-primary');play.disabled=!this.actions.enabled;
  const friend=this.button('',()=>{},'team-lobby-quiet');
  const sync=()=>{const connected=this.data.friends.includes(person.id);relationship.textContent=connected?'Your friend':'Community player';friend.textContent=connected?'Remove Friend':'Add Friend';};sync();
  friend.onclick=()=>{friend.disabled=true;status.textContent='';void this.friend(person.id).then(saved=>{if(saved)sync();else status.textContent=this.message;}).finally(()=>{friend.disabled=false;});};
  actions.append(play,friend);panel.append(avatar,node('h2','',person.manager),relationship,node('p','',person.name),stats,recordStatus,actions,status);dialog.append(header,panel);
  dialog.addEventListener('close',()=>{dialog.remove();const name=Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-person-id]')).find(button=>button.dataset.personId===person.id);(name??this.element.querySelector<HTMLElement>('#friends-tab-'+this.tab))?.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);dialog.showModal();close.focus();
 }
 private async save(metadata:Record<string,unknown>){const client=authClient();if(!client||!this.data.self.id)throw Error('Sign in to save your team.');const {error}=await client.auth.updateUser({data:metadata});if(error)throw error;}
 private async friend(id:string){let saved=false;try{const friends=this.data.friends.includes(id)?this.data.friends.filter(v=>v!==id):[...this.data.friends,id];await this.save({open_play_friends:friends});this.data={...this.data,friends};this.actions.changed(this.data);this.message='';saved=true;}catch(e){this.message=(e as Error).message;}this.draw();return saved;}
}
