import {focusView,showViewDialog} from '../view-focus';
import {rivalryProfile,rivalryCardStory} from './rivalry-view';
import type {MatchRivalry} from './rivalry';
import './rivalry.css';
import type {ActivityRewards} from '../activity-rewards';
import {appNavigation,initialLobbyPage,type LobbyPage} from '../app-navigation';
import {profilePanel} from './profile';
import {AvatarThumbnails} from '../avatar-preview';
import {preloadAthletes} from '../athlete';
import {authClient,matchCredentials} from '../auth-session';
import {remoteRequest} from './api';
import type {profileRecord} from '../profile-record';
import type {LobbyTeam,TeamDirectory} from './team-directory';
import {canShowCommunityAccount} from './community-directory';
import {createYourPlayer} from './friend-flow';
import './team-lobby.css';
function node<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;}
export class TeamLobby {
 readonly element=node('section','team-lobby');
 navigation!:HTMLElement;
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
 constructor(data:TeamDirectory,private actions:{signOut:()=>Promise<void>;authenticate:(signup:boolean,guest:boolean)=>void;roster:()=>void;create:()=>void;invite?:()=>void;challenge:(team:LobbyTeam)=>void;changed:(data:TeamDirectory)=>void;enabled:boolean;games:HTMLElement;rivalryFor?:(opponent:string)=>MatchRivalry|undefined}){this.data=data;this.draw();void preloadAthletes().then(()=>{TeamLobby.portraits??=new AvatarThumbnails(256);if(this.element.isConnected)this.draw()}).catch(()=>{});}
 selectTab(tab:LobbyPage){
  this.tab=tab;history.replaceState(null,'',tab==='games'?'/?openplay=1':`/?openplay=1&tab=${tab}`);this.draw();
  if(tab==='roster')this.actions.roster();
  else{focusView(this.element);window.scrollTo({top:0,behavior:'instant'});}
 }
 private selectFriendsView(view:'friends'|'community'){const keyboard=document.activeElement?.matches(':focus-visible');this.tab=view;history.replaceState(null,'',`/?openplay=1&tab=friends${view==='community'?'&view=community':''}`);this.draw();if(keyboard)this.element.querySelector<HTMLElement>(`#friends-tab-${view}`)?.focus({preventScroll:true});}
 private button(text:string,action:()=>void,cls='team-lobby-quiet'){const b=node('button',cls,text);b.type='button';b.onclick=action;return b;}
 private draw(){
  this.element.replaceChildren();this.element.dataset.tab=this.tab;
  const heading=node('div','team-lobby-heading');
  if(this.tab==='profile'||this.tab==='friends'||this.tab==='community')heading.append(node('h1','',this.tab==='profile'?'Profile':'Friends'));
  else {const copy=node('div','team-lobby-heading-copy');copy.append(node('h1','','Open Play'));heading.append(copy);}
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
   const communityView=this.tab==='community';
   const people=this.data.teams.filter(person=>communityView?canShowCommunityAccount(person.manager,null):this.data.friends.includes(person.id));
   const list=node('div','team-directory-list');list.id='friends-list-panel';list.setAttribute('role','tabpanel');list.setAttribute('aria-labelledby',`friends-tab-${this.tab}`);list.tabIndex=0;
   if(!people.length){const empty=node('div','team-directory-empty');empty.append(node('h2','',this.tab==='friends'?'Build your court circle':'The court is open'),node('p','',this.tab==='friends'?'Find players in Community and add them to Friends for your next match.':'Players will appear here after they complete their first game.'));empty.append(this.button(this.tab==='friends'?'Explore Community':'Create a Game',()=>{if(this.tab==='friends'){this.selectFriendsView('community')}else this.actions.create()}));list.append(empty);}
   let pendingCommunityRecords=communityView?people.length:0;
   const finishCommunityRecord=()=>{if(!communityView||--pendingCommunityRecords||list.querySelector('.lobby-person-row:not([hidden])')||list.querySelector('.team-directory-empty'))return;const empty=node('div','team-directory-empty');empty.append(node('h2','','The court is open'),node('p','','Players will appear here after they complete their first game.'));empty.append(this.button('Create a Game',()=>this.actions.create()));list.append(empty);};
   for(const person of people){
    const card=node('article','lobby-person-row'),identity=node('div','lobby-person-identity');
    card.hidden=communityView;
    if(this.portraits){const avatar=this.button('',()=>this.openFriendProfile(person),'lobby-person-avatar-button');avatar.setAttribute('aria-label',`View ${person.manager}’s profile`);const img=node('img','lobby-person-avatar');img.src=this.portraits.get(person.avatar,'face');img.alt='';avatar.append(img);card.append(avatar);}
    const title=node('h2','');const profile=this.button(person.manager,()=>this.openFriendProfile(person),'lobby-person-name');profile.dataset.personId=person.id;profile.setAttribute('aria-label',`View ${person.manager}’s profile`);title.append(profile);identity.append(title);
    const recordLabel=node('span','lobby-person-record','');title.append(recordLabel);
    const story=rivalryCardStory(this.actions.rivalryFor?.(person.id));
    if(story)identity.append(node('p','lobby-person-rivalry',story));
    void this.record(person).then(record=>{if(!card.isConnected)return;if(communityView&&!canShowCommunityAccount(person.manager,record.games)){card.remove();finishCommunityRecord();return;}card.hidden=false;recordLabel.textContent=` (${record.wins.toLocaleString()}-${record.losses.toLocaleString()})`;recordLabel.setAttribute('aria-label',`${record.wins} wins, ${record.losses} losses`);finishCommunityRecord();}).catch(()=>{if(!card.isConnected)return;card.hidden=false;recordLabel.textContent=' (—)';recordLabel.setAttribute('aria-label','Record unavailable');finishCommunityRecord();});
    const controls=node('div','lobby-person-actions'),challenge=this.button('Challenge',()=>this.actions.challenge(person),'team-lobby-primary');challenge.disabled=!this.actions.enabled;
    if(!this.data.friends.includes(person.id)){controls.classList.add('has-add-friend');controls.append(this.button('Add Friend',()=>void this.friend(person.id),'team-lobby-add-friend'));}controls.append(challenge);
    card.append(identity,controls);list.append(card);
   }
   directory.append(list);
   if(this.tab==='friends'){
    const inviteBar=node('div','friends-invite-bar');
    inviteBar.append(this.button('Invite a Friend',this.actions.invite??this.actions.create,'friends-invite-button'));
    directory.append(inviteBar);
   }
  }
  if(this.tab==='profile')directory.append(profilePanel(this.portraits,this.actions.authenticate,this.actions.signOut));
  const aside=node('div','team-lobby-header-actions');
  const create=this.button('Create a Game',this.actions.create,'team-lobby-primary team-lobby-create');
  if(this.tab==='games'){
   create.setAttribute('aria-label','Create a New Game');
   create.replaceChildren();
   const icon=node('span','lobby-create-plus','+');icon.setAttribute('aria-hidden','true');
   create.append(icon,node('span','','Create a New Game'));
  }
  aside.append(create);

  if(this.navigation?.isConnected)this.navigation.replaceWith(nav);
  this.navigation=nav;
  grid.append(directory);if(this.tab==='games')heading.append(aside);this.element.append(heading,grid);
  const status=node('p','team-lobby-status',this.message);status.setAttribute('role','status');this.element.append(status);
 }
 private openFriendProfile(person:LobbyTeam){
  const dialog=node('dialog','friend-profile-dialog'),header=node('div','friend-profile-header'),title=node('h2','','Profile');
  title.id='friend-profile-title';dialog.setAttribute('aria-labelledby',title.id);
  const close=this.button('✕',()=>dialog.close(),'friend-profile-close');close.setAttribute('aria-label','Close friend profile');header.append(title,close);
  const panel=node('section','lobby-profile friend-profile'),avatar=node('img','profile-avatar');avatar.alt=`${person.manager}’s character`;
  const renderAvatar=()=>{try{TeamLobby.portraits??=new AvatarThumbnails(256);avatar.src=this.portraits!.get(person.avatar,'face')}catch{avatar.hidden=true}};
  if(this.portraits)renderAvatar();else void preloadAthletes().then(renderAvatar).catch(()=>{avatar.hidden=true});
  const relationship=node('p','profile-eyebrow'),actions=node('div','friend-profile-actions profile-actions'),status=node('p','');status.setAttribute('role','status');
  const stats=node('dl','lobby-profile-stats');stats.setAttribute('aria-busy','true');
  const values=['Games','Wins','Losses'].map(label=>{const stat=node('div',''),value=node('dd','','—');stat.append(node('dt','',label),value);stats.append(stat);return value;});
  const recordStatus=node('p','lobby-profile-note','Loading game record…');recordStatus.setAttribute('role','status');
  void (async()=>{
   const record=await this.record(person);
   [record.games,record.wins,record.losses].forEach((value,i)=>values[i].textContent=String(value));recordStatus.remove();
  })().catch(()=>{stats.remove();recordStatus.remove();}).finally(()=>stats.setAttribute('aria-busy','false'));
  const play=this.button('Challenge',()=>{dialog.close();this.actions.challenge(person)},'team-lobby-primary');play.disabled=!this.actions.enabled;
  const friend=this.button('',()=>{},'team-lobby-quiet');
  const sync=()=>{const connected=this.data.friends.includes(person.id);relationship.textContent=connected?'Your friend':'Community player';friend.textContent=connected?'Remove Friend':'Add Friend';};sync();
  friend.onclick=()=>{friend.disabled=true;status.textContent='';void this.friend(person.id).then(saved=>{if(saved)sync();else status.textContent=this.message;}).finally(()=>{friend.disabled=false;});};
  const identity=node('header','profile-identity'),identityCopy=node('div','profile-identity-copy');
  identityCopy.append(relationship,node('h2','',person.manager));
  if(person.name&&person.name!==person.manager)identityCopy.append(node('p','profile-display-name',person.name));
  identity.append(avatar,identityCopy);
  const rivalry=node('section','profile-insights');
  const rivalryData=this.actions.rivalryFor?.(person.id);
  if(rivalryData?.current?.games)rivalry.append(rivalryProfile(rivalryData,person.manager));
  actions.append(friend,play);panel.append(identity,stats,actions,recordStatus,...(rivalry.childElementCount?[rivalry]:[]),status);dialog.append(header,panel);
  dialog.addEventListener('close',()=>{dialog.remove();const name=Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-person-id]')).find(button=>button.dataset.personId===person.id);focusView(this.element);},{once:true});
  document.body.append(dialog);showViewDialog(dialog);focusView(dialog);
 }
 private async save(metadata:Record<string,unknown>){const client=authClient();if(!client||!this.data.self.id)throw Error('Sign in to save your team.');const {error}=await client.auth.updateUser({data:metadata});if(error)throw error;}
 private async friend(id:string){
  let saved=false;this.message='';
  try{
   const removing=this.data.friends.includes(id);
   if(!removing){
    const session=(await authClient()?.auth.getSession())?.data.session;
    if(!session||session.user.is_anonymous){
     const refresh=async()=>{location.reload()};
     await createYourPlayer(async()=>{location.assign('/?openplay=1&setup=1');},{onSignIn:refresh});
     return false;
    }
   }
   // Guests can still remove relationships saved before account gating existed.
   const friends=removing?this.data.friends.filter(v=>v!==id):[...this.data.friends,id];
   await this.save({open_play_friends:friends});this.data={...this.data,friends};this.actions.changed(this.data);saved=true;
  }catch(e){this.message=(e as Error).message;}
  this.draw();return saved;
 }
}
