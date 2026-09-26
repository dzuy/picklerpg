import {openXpHelp} from './xp-help';
import {authClient} from './auth-session';
import './account-xp.css';
export interface AccountProgress {lifetimeXp:number;currentSkillBudget:number;earnedSkillPoints:number;maxSkillBudget:number;xpPerSkillPoint:number;currentXpTowardNextSkillPoint:number;currentPlayStreak:number;lifetimePlayerCreationXpAwards:number}
export interface XpEvent {lifetime_xp:number;final_xp:number;streak_multiplier:number;streak_days:number;skill_points_earned:number;current_skill_budget:number;game_type:string;details:{completion_xp?:number;win_xp?:number}}
export async function accountProgress():Promise<AccountProgress>{const client=authClient();if(!client)throw Error('Connect to see account progress.');const {data,error}=await client.rpc('my_skill_progress');if(error)throw error;return data;}
export function renderAccountProgress(host:HTMLElement,p:AccountProgress,styled=false){
 host.replaceChildren();host.classList.add('account-xp');
 if(styled){
  const card=document.createElement('div');card.className='xp-reward xp-profile';
  const label=document.createElement('p');label.className='xp-reward-label';label.textContent='YOUR TOTAL XP';
  const amount=document.createElement('strong');amount.className='xp-reward-amount';amount.textContent=`${p.lifetimeXp.toLocaleString()} XP`;
  const bar=document.createElement('progress');bar.max=p.xpPerSkillPoint;bar.value=p.currentSkillBudget>=p.maxSkillBudget?p.xpPerSkillPoint:p.currentXpTowardNextSkillPoint;bar.setAttribute('aria-label','XP toward next Skill Point');
  const next=document.createElement('p');next.className='xp-reward-next';next.textContent=p.currentSkillBudget>=p.maxSkillBudget?'Maximum Skill Budget reached':`${p.xpPerSkillPoint-p.currentXpTowardNextSkillPoint} to your next Skill Point`;
  const budget=document.createElement('p');budget.className='xp-profile-budget';budget.textContent=p.lifetimeXp===0?'Play games to earn XP, unlock Skill Points, and improve your players’ skills.':'Skill Points make your players better';
  card.append(label,amount,bar,next,budget);
  if(p.currentPlayStreak){const streak=document.createElement('small');streak.textContent=`${p.currentPlayStreak}-day play streak`;card.append(streak);}
  const help=document.createElement('button');help.type='button';help.className='xp-help-link';help.textContent='How to earn more XP';help.setAttribute('aria-haspopup','dialog');help.onclick=()=>openXpHelp(p,help);card.append(help);
  host.append(card);return;
 }
 const title=document.createElement('strong');title.textContent=`Skill Budget ${p.currentSkillBudget} · Every player`;
 const copy=document.createElement('p'),bar=document.createElement('progress');bar.max=p.xpPerSkillPoint;bar.value=p.currentXpTowardNextSkillPoint;bar.setAttribute('aria-label','XP toward next Skill Point');
 copy.textContent=p.currentSkillBudget>=p.maxSkillBudget?`Maximum Skill Budget reached · ${p.lifetimeXp} lifetime XP`:`${p.currentXpTowardNextSkillPoint} / ${p.xpPerSkillPoint} XP · ${p.xpPerSkillPoint-p.currentXpTowardNextSkillPoint} XP until your next Skill Point`;
 host.append(title,copy);if(p.currentSkillBudget<p.maxSkillBudget)host.append(bar);
 if(p.currentPlayStreak){const streak=document.createElement('small');streak.textContent=`${p.currentPlayStreak}-day play streak`;host.append(streak);}
}
export async function loadAccountProgress(host:HTMLElement,styled=false){host.textContent='Loading account XP…';try{renderAccountProgress(host,await accountProgress(),styled);const client=authClient();if(client){const {data}=await client.from('xp_events').select('source,final_xp,skill_points_earned,current_skill_budget').order('awarded_at',{ascending:false}).limit(1).maybeSingle();if(data&&['invite','player_creation'].includes(data.source)){const receipt=document.createElement('p');receipt.textContent=`Latest reward: ${data.source==='invite'?'Friend activated':'Player created'} +${data.final_xp} XP${data.skill_points_earned?` · Skill Point Earned! Your Skill Budget increased to ${data.current_skill_budget}.`:''}`;host.append(receipt);}}}catch{host.textContent='Account XP is unavailable. Reconnect to refresh.';}}
/** Keep the existing guest identity when registering so its saved progress survives. */
async function createProgressAccount(){
 const {createYourPlayer}=await import('./multiplayer/friend-flow');
 const refresh=async()=>{location.reload()};
 const created=await createYourPlayer(async()=>{},{onSignIn:refresh});
 if(created)await refresh();
}

export function renderGuestProgressCta(host:HTMLElement,createAccount:()=>Promise<void>=createProgressAccount){
 host.replaceChildren();host.classList.add('account-xp');
 const card=document.createElement('div');card.className='xp-reward xp-guest-save';
 const label=document.createElement('p');label.className='xp-reward-label';label.textContent='KEEP YOUR PROGRESS';
 const title=document.createElement('h3');title.className='xp-guest-title';title.textContent='Save your progress';
 const copy=document.createElement('p');copy.className='xp-guest-copy';copy.textContent='Create an account to keep your progress and earn Skill Points to upgrade your players.';
 const button=document.createElement('button');button.type='button';button.className='xp-guest-create';button.textContent='Create account';button.setAttribute('aria-haspopup','dialog');
 const status=document.createElement('p');status.className='xp-guest-status';status.setAttribute('role','status');
 button.onclick=async()=>{
  if(button.disabled)return;button.disabled=true;status.textContent='';
  try{await createAccount();}catch(error){status.textContent=error instanceof Error?error.message:'Account creation is unavailable. Please try again.';}
  finally{button.disabled=false;if(button.isConnected)button.focus({preventScroll:true});}
 };
 card.append(label,title,copy,button,status);host.append(card);
}

/** Read the durable receipt, never award from a presentation callback. */
export async function showGameXp(host:HTMLElement,gameId:string,upgrade:()=>void,mode:'solo'|'friends'='solo'){
 host.dataset.xpGame=gameId;host.classList.add('account-xp');host.setAttribute('aria-live','polite');host.textContent='Loading game XP…';
 try{
 const client=authClient();if(!client)throw Error('Offline');
 const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
 if(host.dataset.xpGame!==gameId)return;
 if(!session){renderGuestProgressCta(host);return;}
 const {data,error}=await client.from('xp_events').select('*').eq('game_id',gameId).maybeSingle();if(error)throw error;
 if(host.dataset.xpGame!==gameId)return;
 if(!data&&session.user.is_anonymous){renderGuestProgressCta(host);return;}
 const p=await accountProgress();if(host.dataset.xpGame!==gameId)return;host.replaceChildren();
 const e=data as XpEvent|null;
 if(e)renderXpReward(host,e,p,upgrade);
 else {
  renderAccountProgress(host,p,true);
  const card=host.querySelector<HTMLElement>('.xp-reward')!;
  card.classList.remove('xp-profile');
  card.querySelector('.xp-reward-label')!.textContent='GAME XP';
  const amount=card.querySelector<HTMLElement>('.xp-reward-amount')!;amount.textContent='No XP recorded';amount.classList.add('xp-reward-empty');
  card.querySelector('.xp-profile-budget')?.remove();card.querySelector('small')?.remove();card.querySelector('.xp-help-link')?.remove();
  const explanation=document.createElement('p');explanation.className='xp-reward-status';
  explanation.textContent=mode==='friends'?'The XP reward for this game isn’t available yet. Reopen the game to check again.':'If this result is waiting to sync, open Match history to retry saving it.';
  card.append(explanation);
  const link=document.createElement('a');link.className='xp-reward-profile-link';link.href='/?openplay=1&tab=profile';link.textContent='See your total XP';card.append(link);
 }

 }catch{if(host.dataset.xpGame!==gameId)return;host.textContent='XP summary unavailable. ';const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>void showGameXp(host,gameId,upgrade,mode);host.append(retry);}
}

/** A short, decorative burst confined to the reward card, with no input blocking. */
function celebrateSkillPoint(card:HTMLElement){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const burst=document.createElement('div');burst.className='xp-confetti';burst.setAttribute('aria-hidden','true');
 const colors=['#ff287a','#00c8e8','#ffda57','#88dd65','#fff'];
 for(let i=0;i<36;i++){
  const piece=document.createElement('i');
  piece.style.setProperty('--x',`${(i*37)%100}%`);
  piece.style.setProperty('--drift',`${((i*29)%140)-70}px`);
  piece.style.setProperty('--spin',`${(i%2?1:-1)*(180+i*23)}deg`);
  piece.style.setProperty('--delay',`${(i%7)*45}ms`);
  piece.style.backgroundColor=colors[i%colors.length];burst.append(piece);
 }
 card.append(burst);window.setTimeout(()=>burst.remove(),2600);
}

/** Animate only a confirmed receipt; this presentation never grants XP. */
export function renderXpReward(host:HTMLElement,e:XpEvent,p:AccountProgress,upgrade:()=>void){
 host.replaceChildren();
 const card=document.createElement('div');card.className='xp-reward';
 card.innerHTML='<p class="xp-reward-label">YOU EARNED XP!</p><strong class="xp-reward-amount"></strong><progress aria-label="XP toward next Skill Point"></progress><p class="xp-reward-next"></p><div class="xp-reward-milestone" hidden></div>';
 const amount=card.querySelector<HTMLElement>('.xp-reward-amount')!,bar=card.querySelector('progress')!,next=card.querySelector<HTMLElement>('.xp-reward-next')!,milestone=card.querySelector<HTMLElement>('.xp-reward-milestone')!;
 const end=e.lifetime_xp,start=Math.max(0,end-e.final_xp),step=p.xpPerSkillPoint;
 const startingBudget=p.currentSkillBudget-p.earnedSkillPoints,cap=(p.maxSkillBudget-startingBudget)*step;
 bar.max=step;
 let celebrated=false;
 const paint=(earned:number,done=false)=>{
  const xp=start+earned,remainder=xp%step,capped=xp>=cap;
  amount.textContent=`+${Math.floor(earned).toLocaleString()} XP`;
  bar.value=capped?step:remainder;
  next.textContent=capped?'Maximum Skill Budget reached':`${Math.ceil(step-remainder)} to your next Skill Point`;
  if(done){
   card.classList.add('is-complete');
   if(e.skill_points_earned>0&&!celebrated){
    celebrated=true;card.classList.add('has-skill-point');milestone.hidden=false;
    card.querySelector('.xp-reward-label')!.textContent='YOUR WHOLE ROSTER JUST LEVELED UP';
    const title=document.createElement('h3');title.className='xp-milestone-title';title.textContent=e.skill_points_earned===1?'Skill Point Earned!':`${e.skill_points_earned} Skill Points Earned!`;
    const copy=document.createElement('p');copy.className='xp-milestone-copy';copy.textContent=`Your Skill Budget is now ${e.current_skill_budget}. You can upgrade each player’s skills—choose where to assign your new ${e.skill_points_earned===1?'point':'points'}.`;
    const button=document.createElement('button');button.type='button';button.textContent='Upgrade player skills';button.onclick=upgrade;
    milestone.append(title,copy,button);celebrateSkillPoint(card);
   }
  }
 };
 // Keep animation ticks out of live announcements; announce the final reward once.
 const profileLink=document.createElement('a');profileLink.className='xp-reward-profile-link';profileLink.href='/?openplay=1&tab=profile';profileLink.textContent='See your total XP';card.append(profileLink);
 card.setAttribute('aria-live','off');host.append(card);paint(0);
 const announce=()=>{const message=document.createElement('span');message.className='xp-reward-announcement';message.textContent=`You earned ${e.final_xp} XP. ${end} total XP.${e.skill_points_earned>0?` ${e.skill_points_earned} Skill ${e.skill_points_earned===1?'Point':'Points'} earned! Your Skill Budget is now ${e.current_skill_budget}. You can upgrade each player’s skills.`:''}`;host.append(message)};
 const begin=()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){paint(e.final_xp,true);announce();return;}
  let began:number|undefined;
  const frame=(now:number)=>{if(!card.isConnected)return;began??=now;const fraction=Math.min(1,(now-began)/1800);paint(e.final_xp*(1-(1-fraction)**3),fraction===1);if(fraction<1)requestAnimationFrame(frame);else announce()};
  requestAnimationFrame(frame);
 };
 // Start when the reward is actually visible, including dialogs opened after fetch.
 const observer=new IntersectionObserver(entries=>{if(!card.isConnected){observer.disconnect();return;}if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();begin();}});
 observer.observe(card);
}
