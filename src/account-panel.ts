import {showViewDialog} from './view-focus';
import {playerHistory,type MatchParticipant} from './player-history';
import type {CloudPlayerSync} from './cloud-players';
import {browserStorage} from './browser-storage';

export function installAccountControls(cloud:CloudPlayerSync,roster:()=>{id:string;name:string}[]=()=>[]){
 const host=document.querySelector('.settings-account')!;
 const actions=document.createElement('div');actions.className='settings-account-actions';
 actions.innerHTML='<button type="button" id="history-open">Match history</button><button type="button" id="account-sign-out" hidden>Sign out</button><button type="button" id="account-resend" hidden>Resend link</button>';
 host.append(actions);
 const dialog=document.createElement('dialog');dialog.id='history-dialog';
 dialog.innerHTML='<button type="button" id="history-close" aria-label="Close match history">✕</button><h2>Match history</h2><label for="history-player">History for</label><select id="history-player"><option value="">Account · all matches</option></select><div id="history-content" aria-live="polite"></div><button type="button" id="history-refresh">Refresh</button>';
 document.body.append(dialog);
 const filter=dialog.querySelector<HTMLSelectElement>('#history-player')!;filter.onchange=()=>void refresh();
 const content=dialog.querySelector<HTMLDivElement>('#history-content')!;
 async function refresh(){
  content.textContent='Loading match history…';
  try{
   await retry();const {matches,progress}=await cloud.history();content.replaceChildren();
   const selected=filter.value,players=new Map<string,string>();
   for(const match of matches)for(const p of (match.participants??[]) as MatchParticipant[])if(!players.has(p.player_id))players.set(p.player_id,p.name);
   for(const p of roster())players.set(p.id,p.name);
   filter.replaceChildren(new Option('Account · all matches',''),...Array.from(players,([id,name])=>new Option(name,id)));filter.value=selected;
   if(selected){const history=playerHistory(matches,selected);
    const summary=document.createElement('p');summary.textContent=`${history.games} completed games · ${history.wins} wins · ${history.losses} losses`;content.append(summary);
    if(!history.entries.length)content.append('No recorded matches for this player yet.');
    for(const entry of history.entries){const card=document.createElement('article');card.className='history-match';const title=document.createElement('strong');title.textContent=`${entry.result} · ${entry.score}–${entry.against}`;const teams=document.createElement('p');teams.textContent=`${entry.home_names} vs ${entry.away_names}`;const date=document.createElement('small');date.textContent=new Date(entry.completed_at).toLocaleString();card.append(title,teams,date);content.append(card)}return;
   }
   const summary=document.createElement('p');summary.textContent=progress?`Level ${progress.level} · ${progress.xp} XP · ${progress.games} games · ${progress.wins} wins · ${progress.losses} losses`:'No completed matches yet. Finish a game to start your history.';content.append(summary);
   if(progress?.unlocks?.length){const badges=document.createElement('p');badges.textContent=`Milestones: ${progress.unlocks.join(' · ')}`;content.append(badges)}
   for(const match of matches){const card=document.createElement('article');card.className='history-match';
    const title=document.createElement('strong');title.textContent=`${match.ended_early?'Ended early':match.won?'Win':'Loss'} · ${match.home_score}–${match.away_score} · +${match.xp} XP`;
    const teams=document.createElement('p');teams.textContent=`${match.home_names} vs ${match.away_names}`;
    const date=document.createElement('small');date.textContent=new Date(match.completed_at).toLocaleString();card.append(title,teams,date);content.append(card);
   }
  }catch{content.textContent='Match history is unavailable. Check your connection and make sure the match-history database migration has been applied. Your pending results stay on this device.'}
 }
 document.getElementById('history-open')!.onclick=()=>{showViewDialog(dialog);void refresh()};
 document.getElementById('history-close')!.onclick=()=>dialog.close();
 document.getElementById('history-refresh')!.onclick=()=>void refresh();
 const status=document.getElementById('account-status')!;
 document.getElementById('account-sign-out')!.onclick=async()=>{try{await retry();await cloud.signOut()}catch(error){status.textContent=(error as Error).message}};
 let busy=false;
 const pendingKey=()=>`pickle-rpg-pending-matches:${cloud.accountId}`;
 type Result={id:string;home_names:string;away_names:string;home_score:number;away_score:number;ended_early?:boolean;participants?:MatchParticipant[]};
 function pending():Result[]{try{return JSON.parse(browserStorage.getItem(pendingKey())??'[]')}catch{return []}}
 async function retry(){
  if(busy)throw new Error('Match save is still in progress. Try again shortly.');if(!cloud.accountId)return;
  busy=true;const owner=cloud.accountId,key=pendingKey();
  try{for(const result of pending()){await cloud.recordMatch(result,owner);const latest=JSON.parse(browserStorage.getItem(key)??'[]') as Result[];browserStorage.setItem(key,JSON.stringify(latest.filter(item=>item.id!==result.id)))}}
  finally{busy=false}
 }
 window.addEventListener('online',()=>void retry().catch(()=>{}));
 const seen=new WeakSet<object>();
 return {async completed(score:object,result:Omit<Result,'id'> & {id?:string}){
  if(seen.has(score)||!cloud.accountId)return;seen.add(score);
  const message=document.getElementById('match-save-status');
  try{const results=pending();const id=result.id??crypto.randomUUID();if(!results.some(row=>row.id===id))results.push({...result,id});browserStorage.setItem(pendingKey(),JSON.stringify(results));if(message)message.textContent='Saving match…';await retry();if(message)message.textContent='Match saved · View it in Settings → Match history';}
  catch{if(message)message.textContent='Match waiting to sync. Open Match history to retry.'}
 },retry};
}
