import {openFullGameAnalysis} from '../full-game-analysis';
import type {ProfileGame} from '../profile-game-history';
import {showViewDialog} from '../view-focus';
import './game-history.css';

export function openGameHistory(trigger:HTMLElement,loadGames:()=>Promise<ProfileGame[]>){
 const dialog=document.createElement('dialog');dialog.className='full-analysis-dialog game-history-dialog';dialog.setAttribute('aria-labelledby','game-history-title');
 dialog.innerHTML='<header class="full-analysis-header"><div><span class="full-analysis-eyebrow">YOUR COMPLETED GAMES</span><h2 id="game-history-title">Game history</h2></div><button type="button" aria-label="Close game history">✕</button></header><div class="game-history-content"></div>';
 const content=dialog.querySelector<HTMLDivElement>('.game-history-content')!;
 dialog.querySelector<HTMLButtonElement>('header button')!.onclick=()=>dialog.close();
 document.body.append(dialog);showViewDialog(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();trigger.focus({preventScroll:true})},{once:true});
 async function load(){
  content.textContent='Loading your games…';content.setAttribute('aria-busy','true');
  try{
   const games=await loadGames();if(!dialog.open)return;content.replaceChildren();
   if(!games.length){content.textContent='No completed games yet. Finish a game and it will appear here.';return;}
   const list=document.createElement('ol');list.className='game-history-list';
   for(const game of games){
    const item=document.createElement('li'),heading=document.createElement('h3'),teams=document.createElement('p'),date=document.createElement('p'),button=document.createElement('button');
    heading.textContent=`${game.score>game.against?'Win':'Loss'} · ${game.score}–${game.against}`;
    teams.textContent=`${game.home} vs ${game.away}`;
    date.className='game-history-date';const timestamp=new Date(game.completedAt);date.textContent=[game.mode==='solo'?'Solo':'Friends',Number.isNaN(timestamp.getTime())?'':timestamp.toLocaleString()].filter(Boolean).join(' · ');
    button.type='button';button.className='game-history-analysis';button.textContent='Full Game Analysis';button.setAttribute('aria-haspopup','dialog');
    const premium=document.createElement('span');premium.className='full-analysis-premium';premium.textContent='Premium';button.append(premium);
    button.onclick=()=>openFullGameAnalysis(game,button);
    item.append(heading,teams,date,button);list.append(item);
   }
   content.append(list);
  }catch{if(!dialog.open)return;content.textContent='Your game history could not be loaded. Please try again.';const retry=document.createElement('button');retry.type='button';retry.className='full-analysis-retry';retry.textContent='Try again';retry.onclick=()=>void load();content.append(retry);}
  finally{content.setAttribute('aria-busy','false');}
 }
 void load();
}
