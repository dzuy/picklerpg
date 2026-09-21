import {installGameListExit} from './game-list-exit';
import {gameCardLineup} from './game-card-lineup';
import {openGameSurface} from './game-surface';
import {OpenPlayStore} from './persistence/open-play-store';
import {browserStorage} from './browser-storage';
import {COURT_LOCATIONS} from './locations';
export function renderOpenPlayGames(host:HTMLElement,owner:string,filter:string,refresh:()=>void,onError:(message:string)=>void){
 const store=new OpenPlayStore(browserStorage,owner);
 try{
  const games=store.list().filter(g=>filter==='archived'?g.archived:!g.archived&&(filter==='completed'?g.ended||!!g.checkpoint.scoring.winner:!g.ended&&!g.checkpoint.scoring.winner)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  for(const game of games){
   const c=game.checkpoint,done=game.ended||!!c.scoring.winner;
   const row=document.createElement('div');row.className='remote-game-entry';
   const card=document.createElement('button');card.className='remote-game-card has-player-faces';card.dataset.state=done?'finished':'ready';
   const text=(tag:string,className:string,value:string)=>{const el=document.createElement(tag);el.className=className;el.textContent=value;card.append(el)};
   const name=(slot:keyof typeof c.roster,fallback:string)=>c.roster[slot].design?.name??fallback;
   text('span','remote-badge '+(done?'finished':'ready'),game.ended?'Ended':done?'Finished':c.mode==='solo'?'SOLO GAME':'Ready to play');
   const player=(slot:keyof typeof c.roster,fallback:string)=>({name:name(slot,fallback),appearance:c.roster[slot].design?.appearance});
   card.append(gameCardLineup([player('you','You'),player('partner','Finn')],[player('opponent-left','Jules'),player('opponent-right','Rio')]));
   text('span','remote-card-score',`${c.scoring.score.home} – ${c.scoring.score.away}`);
   text('span','remote-card-ref',`${COURT_LOCATIONS.find(l=>l.id===game.court)?.name} · ${c.rules.scoring==='rally-doubles'?'Rally':'Side-out'} · First to ${c.rules.target}`);
   text('span','remote-card-ref',`${c.mode==='local-human'?'Two managers · Same device':'Team B · Computer managed'} · Saved on this browser`);
   text('span','remote-card-action',done?'View result ↗':'Resume game ↗');
   card.onclick=()=>openGameSurface(`/?game=${encodeURIComponent(c.matchId)}`);
   if(!done&&!game.archived)installGameListExit(card,{
    title:'End this game?',message:'This ends your saved game. You can still view its result in Finished games.',action:'End game',
    confirm:()=>{store.end(c.matchId);refresh();}
   });
   const archive=document.createElement('button');archive.className='remote-quiet remote-archive-action';archive.textContent=game.archived?'Restore':'Archive';archive.setAttribute('aria-label',`${archive.textContent} ${name('you','your team')} game`);
   archive.onclick=()=>{try{store.archive(c.matchId,!game.archived);refresh()}catch(error){onError((error as Error).message)}};
   row.append(card,archive);host.append(row);
  }
  return games.length;
 }catch(error){onError((error as Error).message);return 0;}
}
