import {fillSetupPlayerCard} from '../setup-player-card';
import {authClient} from '../auth-session';
import {playerFromRow} from '../cloud-players';
import {defaultLineup} from './default-lineup';
import {rosterStarters,ownedRosterPlayers,starterIds} from '../roster-membership';
import {CommunitySection} from '../community-section';
import {communityPlayers,refreshCommunityDesigns} from '../community-players';
import type {DesignedPlayer} from '../player-design';
import {shufflePlayers,cyclePlayer} from '../match-setup-state';
import {parseLibrary,PLAYER_STORAGE_KEY} from '../player-design';
import {preloadAthletes} from '../athlete';
import {AvatarThumbnails} from '../avatar-preview';
import {fillPlayerCard} from '../player-card';
import {attachPlayerDetails} from '../player-details';
import type {TeamSelection} from './invitation-protocol';
import {browserStorage} from '../browser-storage';
/** Same roster/preset selection and rendered athletes as solo setup, restricted to your team. */
export class TeamPicker {
 private lineup={players:[...ownedRosterPlayers(parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY)).players),...rosterStarters()],selected:[] as string[]};
 private community=new CommunitySection(players=>this.setCommunity(players));
 private setCommunity(players:DesignedPlayer[]){const all=[...ownedRosterPlayers(this.ownedPlayers??parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY)).players),...players];for(const p of (this.useDefaults?[]:this.initial??[]))if(!all.some(v=>v.id===p.id))all.push(p);const selected=this.lineup.selected.filter(id=>all.some(p=>p.id===id));for(const p of all)if(selected.length<2&&!selected.includes(p.id))selected.push(p.id);while(selected.length<2&&all.length)selected.push(all[0].id);this.lineup={players:all,selected:this.useDefaults&&!this.defaultsApplied?defaultLineup(all,this.defaultActiveId,this.defaultUsername,undefined,starterIds()):selected.slice(0,2)};this.defaultsApplied=true;this.draw();}
 private defaultActiveId:string|null=null;private defaultUsername='';private defaultsApplied=false;
 private ready:Promise<void>=Promise.resolve();
 async freshTeam(){await this.ready;if(this.lineup.selected.length<2)throw Error(this.publicOpponents?'No public opponents are available. Please try again later.':'Add a player to Your Roster.');return await refreshCommunityDesigns(this.team) as TeamSelection}
 private static portraits:AvatarThumbnails|undefined;
 async hasTeam(){await this.ready;return this.lineup.selected.length>=2;}
 constructor(private host:HTMLElement,private ownedPlayers?:DesignedPlayer[],private initial?:TeamSelection,private useDefaults=false,private publicOpponents=false){this.useDefaults=!publicOpponents;if(ownedPlayers)this.lineup.players=[...ownedRosterPlayers(ownedPlayers),...rosterStarters()];this.lineup.selected=this.lineup.players.length?[this.lineup.players[0].id,(this.lineup.players[1]??this.lineup.players[0]).id]:[];if(initial){for(const p of initial)if(!this.lineup.players.some(v=>v.id===p.id))this.lineup.players.push(p);this.lineup.selected=initial.map(p=>p.id);}
 if(this.publicOpponents)this.lineup={players:[],selected:[]};
 this.draw();this.ready=this.publicOpponents?this.loadPublicOpponents():this.useDefaults?this.loadDefaultRoster():this.community.load();void this.ready.catch(error=>{this.host.replaceChildren();const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=(error as Error).message;this.host.append(notice);});void preloadAthletes().then(()=>{if(this.host.isConnected)this.draw()}).catch(()=>{})}
 private async loadPublicOpponents(){
  const rows=await communityPlayers();
  const players=rows.map(row=>row.player);
  this.lineup={players,selected:players.length?[players[0].id,(players[1]??players[0]).id]:[]};
  this.draw();
 }
 private async loadDefaultRoster(){
  this.host.inert=true;this.host.setAttribute('aria-busy','true');
  try{
   const client=authClient();const session=client?(await client.auth.getSession()).data.session:null;
   if(client&&session){
    const {data,error}=await client.from('players').select('id,name,catchphrase,appearance,skills,handedness,is_active,is_public').eq('owner_id',session.user.id);
    if(error)throw Error('Could not load your roster. Reopen setup to try again.');
    this.ownedPlayers=(data??[]).map(playerFromRow);this.defaultActiveId=data?.find(row=>row.is_active)?.id??null;
    this.defaultUsername=String(session.user.user_metadata?.username??session.user.user_metadata?.player_name??'');
   }else{const library=parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY));this.ownedPlayers=library.players;this.defaultActiveId=library.activeId;}
   await this.community.load();
  }finally{this.host.inert=false;this.host.removeAttribute('aria-busy');}
 }
 get team():TeamSelection{return this.lineup.selected.slice(0,2).map(id=>structuredClone(this.lineup.players.find(p=>p.id===id)!)) as TeamSelection}
 async shuffle(){await this.ready;const ids=shufflePlayers(this.lineup.players.map(p=>p.id));if(ids.length)this.lineup.selected=[ids[0],ids[1]??ids[0]];this.draw();}
 private draw(){
  this.host.replaceChildren();this.host.className='remote-team-picker roster-grid';
  const gameSetup=this.host.id==='remote-create-team'||this.host.id==='remote-solo-opponents';
  this.team.forEach((p,i)=>{
   const role=i?'Athlete 2':'Athlete 1',card=document.createElement('article');card.className='roster-card remote-team-card';
   let portrait='';if(!gameSetup)try{TeamPicker.portraits??=new AvatarThumbnails(384);portrait=TeamPicker.portraits.get(p.appearance,'roster')}catch{}
   const credit=gameSetup?(p.id.startsWith('preset-')?'Starting Lineup':p.id.startsWith('community-')?'Community player':this.defaultUsername?`By ${this.defaultUsername}`:'Your player'):role;
   if(gameSetup)fillSetupPlayerCard(card,p,credit);else{fillPlayerCard(card,p,credit,portrait);attachPlayerDetails(card,p,role,portrait);}
   const controls=document.createElement('div');controls.className='roster-card-actions remote-team-controls';for(const step of [-1,1]){const button=document.createElement('button');button.type='button';button.dataset.teamSlot=String(i);button.dataset.teamStep=String(step);button.textContent=gameSetup?(step<0?'‹':'›'):(step<0?'‹ Previous':'Next ›');button.setAttribute('aria-label',`${step<0?'Previous':'Next'} ${i?'partner':'player'}`);button.onclick=()=>{const keyboard=button.matches(':focus-visible');this.lineup.selected=cyclePlayer(this.lineup.players.map(p=>p.id),this.lineup.selected.slice(0,2),i,step);this.draw();if(keyboard)this.host.querySelector<HTMLButtonElement>(`[data-team-slot="${i}"][data-team-step="${step}"]`)?.focus()};controls.append(button)}
   card.append(controls);this.host.append(card);
  });
  if(this.lineup.selected.length<2){
   const empty=document.createElement('p');empty.className='remote-team-empty';empty.setAttribute('role','status');empty.textContent=this.publicOpponents?'No public opponents are available.':'Add a player below to complete your team. You can use the same character in both slots.';this.host.append(empty);if(!this.publicOpponents)this.host.append(this.community.element);
  }
  const note=document.createElement('p');note.className='remote-team-stat-note';note.textContent='Your players use their actual skills in this match.';this.host.append(note);
 }
}
