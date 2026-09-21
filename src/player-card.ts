import {SKILLS} from './engine/model';
import {skillLevel} from './player-skill-summary';
import {LOOKS} from './avatar-preview';
import {summarizeSkills} from './player-skill-summary';
import type {DesignedPlayer} from './player-design';
import {playerHistory,type HistoryMatch} from './player-history';
export function fillPlayerCard(article:HTMLElement,player:DesignedPlayer,role:string,portrait:string){
   const themeIndex=LOOKS.findIndex(look=>look.name===player.name);
   const themes=[['#ff9389','All court.\nAll fun.'],['#78aff2','Power changes\ngames.'],['#ffda73','Think\nahead.'],['#95aedf','Fast moves.\nBig plays.'],['#c5a3f2','Small details.\nBig wins.'],['#a7b5d2','Defend and\ndeliver.'],['#d1a0ef','Creativity keeps\nyou ahead.'],['#a5b8df','Any court.\nAny day.']];
   const [color]=themes[themeIndex<0?Math.abs(player.name.length)%themes.length:themeIndex];
   article.style.setProperty('--card-color',color);
   const energyColors=['#ff4b91','#40d8ed','#ad7bff','#ffc65a','#a6df4f'];
   const energySeed=[...player.name].reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,0);
   article.style.setProperty('--card-energy',energyColors[energySeed%energyColors.length]);
   const banner=document.createElement('div');banner.className='roster-banner';
   if(portrait){const img=document.createElement('img');img.src=portrait;img.alt=player.name;banner.append(img)}
   const slogan=document.createElement('span');slogan.className='roster-motto';slogan.textContent=player.catchphrase?.trim()??'';banner.append(slogan);
   const doodle=document.createElement('span');doodle.className='roster-doodle';doodle.textContent=themeIndex%2===0?'✧':'〰';doodle.setAttribute('aria-hidden','true');banner.append(doodle);article.append(banner);
   const heading=document.createElement('h3');heading.textContent=player.name;const identity=document.createElement('div');identity.className='roster-card-identity';identity.append(heading);article.append(identity);
   const description=document.createElement('p');description.textContent=role;description.className=role.startsWith('By ')?'roster-role roster-credit':'roster-role';identity.append(description);
   const {meters,estimatedDupr}=summarizeSkills(player.skills);
   const rating=document.createElement('p');rating.className='roster-rating';rating.innerHTML='<span>DUPR</span><strong>'+estimatedDupr.toFixed(2)+'</strong>';rating.title='Game skill estimate, not an official DUPR rating';article.append(rating);
   const summary=document.createElement('dl');for(const [name,value] of Object.entries(meters)){const row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd');row.dataset.stat=name;const icon=document.createElement('span');icon.className='roster-stat-icon';icon.setAttribute('aria-hidden','true');icon.textContent=({Power:'ϟ',Control:'◎',Speed:'➟',Hands:'✋',Defense:'⛨'} as Record<string,string>)[name];term.append(icon,document.createTextNode(name));const meter=document.createElement('span');meter.className='five-block-meter';meter.setAttribute('role','meter');meter.setAttribute('aria-label',name);meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','10');meter.setAttribute('aria-valuenow',String(Math.ceil(value/10)));meter.title=name+': '+Math.ceil(value/10)+'/10';for(let i=0;i<5;i++){const block=document.createElement('i');block.style.setProperty('--fill',Math.max(0,Math.min(100,(value-i*20)*5))+'%');meter.append(block)}detail.append(meter);row.append(term,detail);summary.append(row)}article.append(summary);
}
export function playerRecord(id:string|null,history:Promise<HistoryMatch[]>){
 void history.catch(()=>{});
 const record=document.createElement('p');record.className='player-record';record.setAttribute('role','status');record.textContent=id?'Loading record…':'No tracked player record';
 if(id)void history.then(matches=>{const stats=playerHistory(matches,id);record.textContent=`${stats.wins} ${stats.wins===1?'win':'wins'} · ${stats.losses} ${stats.losses===1?'loss':'losses'}`;record.title='Recorded completed games; early exits are excluded.'}).catch(()=>{record.textContent='Record unavailable';});
 return record;
}

export function playerSkillDetails(player:DesignedPlayer){
 const details=document.createElement('details'),label=document.createElement('summary');label.textContent='View skill details';details.append(label);
 for(const skill of SKILLS){const title=skill.charAt(0).toUpperCase()+skill.slice(1);const line=document.createElement('div');line.className='roster-skill';const name=document.createElement('span');name.textContent=title;const meter=document.createElement('meter');meter.min=0;meter.max=10;meter.value=player.skills[skill]/10;meter.setAttribute('aria-label',title);meter.title=skillLevel(player.skills[skill]);const value=document.createElement('span');value.textContent=(player.skills[skill]/10).toFixed(1);line.append(name,meter,value);details.append(line)}
 return details;
}
