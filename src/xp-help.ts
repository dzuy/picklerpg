import config from './xp-config.json';
import type {AccountProgress} from './account-xp';
import {showViewDialog} from './view-focus';

/** Explain rewards using the same configuration shipped with the XP migration. */
export function openXpHelp(progress:AccountProgress,trigger:HTMLElement){
 const dialog=document.createElement('dialog');dialog.className='xp-help';dialog.setAttribute('aria-labelledby','xp-help-title');
 const remaining=Math.max(0,config.playerCreation.limit-progress.lifetimePlayerCreationXpAwards);
 dialog.innerHTML=`<header><div><p class="xp-help-eyebrow">GROW YOUR GAME</p><h2 id="xp-help-title">How to earn more XP</h2></div><button type="button" aria-label="Close XP guide">✕</button></header>
 <p class="xp-help-intro">Every ${progress.xpPerSkillPoint} XP earns a Skill Point to improve each player in your roster, up to your maximum Skill Budget.</p>
 <ul>
 <li><div><h3>Finish a Solo game</h3><p>Earn ${config.solo.normal[0]} XP for completing a game, plus ${config.solo.normal[1]} more if you win.</p></div><strong>${config.solo.normal[0]}–${config.solo.normal[0]+config.solo.normal[1]} XP</strong></li>
 <li><div><h3>Finish a game with a friend</h3><p>Earn ${config.friends[0]} XP for completing a Friends game against a person or community bot, plus ${config.friends[1]} more for a win.</p></div><strong>${config.friends[0]}–${config.friends[0]+config.friends[1]} XP</strong></li>
 <li><div><h3>Invite someone to play</h3><p>Earn ${config.invite.joined} XP when your invite is their first accepted challenge and they have a registered account. Earn another ${config.invite.first_game} when they finish their first Friends game.</p></div><strong>Up to ${config.invite.joined+config.invite.first_game} XP</strong></li>
 <li><div><h3>Create your own players</h3><p>Earn ${config.playerCreation.xp} XP for each of your first ${config.playerCreation.limit} player creations. ${remaining?`${remaining} creation reward${remaining===1?'':'s'} remaining.`:'You’ve used your creation rewards.'} Adding community players doesn’t count.</p></div><strong>+${config.playerCreation.xp} XP</strong></li>
 <li><div><h3>Keep a daily play streak</h3><p>Finish at least one game on consecutive days to multiply your game XP. ${config.streak.filter(([days])=>days>1).map(([days,multiplier])=>`Day ${days}: ×${multiplier}`).join(' · ')}. Days reset at midnight UTC; missing a day resets the streak. Invite and creation rewards aren’t multiplied.</p></div><strong>Up to ×${config.streak.at(-1)![1]}</strong></li>
 </ul><p class="xp-help-note">Finish the match to earn game XP—ending early doesn’t count. Make sure your result has synced to your account.</p>`;
 document.body.append(dialog);
 dialog.querySelector('button')!.onclick=()=>dialog.close();
 let outsideDown=false;const outside=(e:MouseEvent)=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
 dialog.onpointerdown=e=>{outsideDown=e.target===dialog&&outside(e)};
 dialog.onclick=e=>{if(e.target===dialog&&outsideDown&&outside(e))dialog.close()};
 showViewDialog(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true})},{once:true});
}
