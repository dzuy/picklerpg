import type {LobbyTeam} from './team-directory';

export function matchingFriends(teams:LobbyTeam[],query:string){
 const needle=query.trim().replace(/^@/,'').toLowerCase();
 if(!needle)return [];
 return teams.filter(team=>team.manager.toLowerCase().includes(needle)).sort((a,b)=>Number(!a.manager.toLowerCase().startsWith(needle))-Number(!b.manager.toLowerCase().startsWith(needle))||a.manager.localeCompare(b.manager)).slice(0,8);
}

/** Selection retains the account ID; editing the name returns to a link invitation. */
export class FriendSearch {
 private list=document.createElement('div');
 private hint:HTMLElement;
 private matches:LobbyTeam[]=[];
 private active=-1;
 constructor(private input:HTMLInputElement,private teams:()=>LobbyTeam[],private select:(team:LobbyTeam|null)=>void,private portrait:(team:LobbyTeam)=>string=()=>''){
  this.hint=input.parentElement!.querySelector('small')!;
  this.list.id='friend-search-results';this.list.className='friend-search-results';this.list.setAttribute('role','listbox');this.list.setAttribute('aria-label','Matching usernames');this.list.hidden=true;input.after(this.list);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',this.list.id);input.setAttribute('aria-expanded','false');input.placeholder='Search username or enter a new name';
  this.hint.id='friend-search-hint';this.hint.setAttribute('role','status');input.setAttribute('aria-describedby',this.hint.id);
  input.addEventListener('input',()=>{this.select(null);this.search();});
  input.addEventListener('focus',()=>this.search());
  input.addEventListener('blur',()=>this.close());
  input.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();this.close();return;}
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();if(this.list.hidden)this.search();if(!this.matches.length)return;
    this.active=(this.active+(event.key==='ArrowDown'?1:-1)+this.matches.length)%this.matches.length;this.highlight();
   }else if(event.key==='Enter'&&!this.list.hidden&&this.active>=0){event.preventDefault();this.choose(this.matches[this.active]);}
  });
 }
 reset(team?:LobbyTeam){this.input.value=team?.manager??'';this.select(team??null);this.hint.textContent=team?`Invitation will be sent to ${team.manager}.`:'';this.close();}
 private search(){
  this.matches=matchingFriends(this.teams(),this.input.value);this.active=-1;this.list.replaceChildren();this.input.removeAttribute('aria-activedescendant');
  for(const [index,team] of this.matches.entries()){
   const option=document.createElement('div');option.id=`friend-search-option-${index}`;option.className='friend-search-option';option.setAttribute('role','option');option.setAttribute('aria-selected','false');
   const avatar=document.createElement('img');avatar.className='friend-search-avatar';avatar.alt='';avatar.src=this.portrait(team);
   const name=document.createElement('strong');name.textContent=team.manager;option.append(avatar,name);
   option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>this.choose(team));this.list.append(option);
  }
  this.list.hidden=!this.matches.length;this.input.setAttribute('aria-expanded',String(!this.list.hidden));
  this.hint.textContent=this.input.value.trim()?(this.matches.length?'Choose a username to send an in-app invitation.':'New player: you’ll get a game link to share.'):'';
 }
 private highlight(){Array.from(this.list.children).forEach((option,index)=>option.setAttribute('aria-selected',String(index===this.active)));this.input.setAttribute('aria-activedescendant',`friend-search-option-${this.active}`);}
 private choose(team:LobbyTeam){this.input.value=team.manager;this.select(team);this.close();this.hint.textContent=`Invitation will be sent to ${team.manager}.`;}
 private close(){this.list.hidden=true;this.active=-1;this.input.setAttribute('aria-expanded','false');this.input.removeAttribute('aria-activedescendant');}
}
