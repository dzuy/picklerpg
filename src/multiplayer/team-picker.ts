import {rosterStarters} from '../roster-membership';
import {CommunitySection} from '../community-section';
import {refreshCommunityDesigns} from '../community-players';
import type {DesignedPlayer} from '../player-design';
import {cyclePlayer} from '../match-setup-state';
import {parseLibrary,PLAYER_STORAGE_KEY} from '../player-design';
import {preloadAthletes} from '../athlete';
import {summarizeSkills} from '../player-skill-summary';
import {LOOKS} from '../player-looks';
import {AvatarThumbnails} from '../avatar-preview';
import type {TeamSelection} from './invitation-protocol';
import '../match-setup.css';
/** Same roster/preset selection and rendered athletes as solo setup, restricted to your team. */
export class TeamPicker {
 private lineup={players:[...parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY)).players,...rosterStarters()],selected:[] as string[]};
 private community=new CommunitySection(players=>this.setCommunity(players));
 private setCommunity(players:DesignedPlayer[]){const all=[...parseLibrary(localStorage.getItem(PLAYER_STORAGE_KEY)).players,...players];const selected=this.lineup.selected.filter(id=>all.some(p=>p.id===id));for(const p of all)if(selected.length<2&&!selected.includes(p.id))selected.push(p.id);this.lineup={players:all,selected:selected.slice(0,2)};this.draw();}
 private ready:Promise<void>=Promise.resolve();
 async freshTeam(){await this.ready;if(this.lineup.selected.length<2)throw Error('Add at least two players to Your Roster.');return await refreshCommunityDesigns(this.team) as TeamSelection}
 private static portraits:AvatarThumbnails|undefined;
 constructor(private host:HTMLElement){this.lineup.selected=this.lineup.players.slice(0,2).map(p=>p.id);this.draw();this.ready=this.community.load();void preloadAthletes().then(()=>{if(this.host.isConnected)this.draw()}).catch(()=>{})}
 get team():TeamSelection{return this.lineup.selected.slice(0,2).map(id=>structuredClone(this.lineup.players.find(p=>p.id===id)!)) as TeamSelection}
 private draw(){
  this.host.replaceChildren();this.host.className='remote-team-picker setup-team-players';
  this.team.forEach((p,i)=>{
   const card=document.createElement('article');card.className='setup-player';card.style.setProperty('--card-accent',i?'#12E1F3':'#FF3D7D');
   const label=document.createElement('p');label.textContent=i?'Your partner':'Your player';label.className='remote-player-role';
   const portrait=document.createElement('div');portrait.className='setup-portrait';const preset=LOOKS.findIndex((look,index)=>p.id===`preset-${index}`&&JSON.stringify(look.appearance)===JSON.stringify(p.appearance));let source=preset>=0&&preset<4?`/assets/picklebash-select/players/${['ema','leo','maya','jax'][preset]}-card-art.jpg`:'';if(source)portrait.classList.add('setup-illustrated');if(!source)try{TeamPicker.portraits??=new AvatarThumbnails(384);source=TeamPicker.portraits.get(p.appearance,`hand-${p.handedness}`)}catch{}if(source){const image=document.createElement('img');image.src=source;image.alt=p.name;portrait.append(image)}else{portrait.textContent=p.name.slice(0,1)}
   const meta=document.createElement('div');meta.className='setup-player-meta';const name=document.createElement('h2');name.textContent=p.name;meta.append(name);
   const summary=summarizeSkills(p.skills),rating=document.createElement('p');rating.className='remote-team-rating';rating.textContent=`DUPR ${summary.estimatedDupr.toFixed(2)}`;rating.title='Estimated game rating, not an official DUPR rating';meta.append(rating);
   const stats=document.createElement('dl');stats.className='remote-team-stats';for(const [label,value] of Object.entries(summary.meters)){const row=document.createElement('div'),term=document.createElement('dt'),score=document.createElement('dd'),meter=document.createElement('meter');term.textContent=label;score.textContent=String(Math.round(value));meter.min=0;meter.max=100;meter.value=value;meter.setAttribute('aria-label',label);row.append(term,score,meter);stats.append(row);}meta.append(stats);
   const controls=document.createElement('div');controls.className='setup-picker';for(const step of [-1,1]){const button=document.createElement('button');button.type='button';button.textContent=step<0?'‹':'›';button.setAttribute('aria-label',`${step<0?'Previous':'Next'} ${i?'partner':'player'}`);button.onclick=()=>{this.lineup.selected=cyclePlayer(this.lineup.players.map(p=>p.id),this.lineup.selected.slice(0,2),i,step);this.draw();this.host.querySelectorAll<HTMLButtonElement>('button')[i*2+(step>0?1:0)]?.focus()};controls.append(button)}
   card.append(label,portrait,meta,controls);this.host.append(card);
  });
  const note=document.createElement('p');note.className='remote-team-stat-note';note.textContent='Player ratings shown. Multiplayer currently uses equal gameplay skills.';this.host.append(note,this.community.element);
 }
}
