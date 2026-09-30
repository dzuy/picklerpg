import {authClient} from './auth-session';
import {signInDialog} from './multiplayer/sign-in-dialog';
import {percentage,type AnalyticsDashboard,type AnalyticsPeriod} from './analytics/dashboard-contract';
import './admin-analytics.css';

document.title='Analytics · PickleBash';
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<main class="analytics-page"><header class="analytics-header"><div><a class="analytics-brand" href="/?openplay=1">PICKLEBASH <span> / ADMIN</span></a><h1>How’s the game doing?</h1><p>A few numbers. A clearer picture.</p></div><div class="analytics-controls"><label for="analytics-range" class="sr-label">Date range</label><select id="analytics-range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select><button id="analytics-refresh" type="button">Refresh</button></div></header><div id="analytics-status" role="status" aria-live="polite"></div><section id="analytics-content" aria-label="Analytics overview"></section><footer>Production activity · UTC · Human players, including games against computer opponents.<br>Multiplayer outcomes are confirmed by the server. Some activity may be missing when tracking is blocked.</footer></main>`;
const content=root.querySelector<HTMLElement>('#analytics-content')!,status=root.querySelector<HTMLElement>('#analytics-status')!,range=root.querySelector<HTMLSelectElement>('select')!,refresh=root.querySelector<HTMLButtonElement>('#analytics-refresh')!;
const number=(n:number|null)=>n===null?'—':new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
const ratio=(p:AnalyticsPeriod)=>p.active?p.participations/p.active:null;
export function renderDashboard(data:AnalyticsDashboard){
 content.replaceChildren();
 const complete=Date.parse(data.previousStart)>=Date.parse(data.coverageSince);
 const partial=Date.parse(data.start)<Date.parse(data.coverageSince);
 status.textContent=`Updated ${new Date(data.generatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · ${new Date(data.start).toLocaleDateString('en',{timeZone:'UTC',month:'short',day:'numeric'})}–${new Date(data.end).toLocaleDateString('en',{timeZone:'UTC',month:'short',day:'numeric'})}${partial?' · Early data: tracking began '+new Date(data.coverageSince).toLocaleDateString('en',{timeZone:'UTC',month:'short',day:'numeric'}):''}`;
 function card(title:string,question:string,value:(p:AnalyticsPeriod)=>number|null,definition:string,percent=false,historyDays=0){
  const el=document.createElement('article');el.className='analytics-card';
  const label=document.createElement('p');label.className='analytics-eyebrow';label.textContent=question;
  const heading=document.createElement('h2');heading.textContent=title;
  const current=value(data.current),previous=value(data.previous);
  const amount=document.createElement('strong');amount.className='analytics-value';amount.textContent=number(current)+(percent&&current!==null?'%':'');
  const delta=document.createElement('p');delta.className='analytics-change';
  delta.textContent=!(complete&&Date.parse(data.previousStart)-historyDays*86400000>=Date.parse(data.coverageSince))?'Comparison available after more tracking history':current===null?'Not enough data yet':previous===null||previous===0?'No comparable activity in the previous period':`${current-previous>0?'+':''}${number(percent?current-previous:100*(current-previous)/previous)}${percent?' points':'%'} vs previous ${data.days} days`;
  const details=document.createElement('details'),summary=document.createElement('summary'),copy=document.createElement('p');summary.textContent='What this means';copy.textContent=definition;details.append(summary,copy);el.append(label,heading,amount,delta,details);content.append(el);
 }
 card('Active players','ARE PEOPLE PLAYING?',p=>p.active,'Distinct people who opened the app or chose a shot during this period. Repeat visits count once; merged identities stay together.');
 card('New accounts','IS THE COMMUNITY GROWING?',p=>p.accounts,'Registered accounts created or upgraded from a guest account during this period. Historical signups before tracking began are not reconstructed.');
 card('Games completed','ARE THEY FINISHING?',p=>p.completed,'Distinct multiplayer games completed in this period. A game with two human players counts once. Solo and local games are excluded.');
 card('Completion rate','DO GAMES REACH THE END?',p=>percentage(p.finished,p.started),'Of multiplayer games started in this period, the percentage also completed before the period ended. Recent games may still be in progress.',true);
 card('Rematch rate','DO THEY WANT ANOTHER?',p=>percentage(p.rematched,p.rematchEligible),'Of multiplayer games completed in this period, the percentage followed by a manual or automatic rematch request within the same period. A request is not an accepted or completed rematch.',true);
 card('Games per player','HOW MUCH DO THEY PLAY?',ratio,'Completed multiplayer match participations among players active in this period, divided by active players. This period-wide measure differs from an average of daily averages.');
 const invite=document.createElement('article');invite.className='analytics-card analytics-invites';invite.innerHTML='<p class="analytics-eyebrow">ARE INVITATIONS WORKING?</p><h2>From invitation to first game</h2>';
 const flow=document.createElement('ol');flow.className='analytics-funnel';
 for(const [label,value] of [['Sent',data.current.invited],['Accepted',data.current.accepted],['First turn',data.current.activated],['Game finished',data.current.inviteCompleted]] as const){const li=document.createElement('li'),n=document.createElement('strong'),l=document.createElement('span');n.textContent=number(value);l.textContent=label;li.append(n,l);flow.append(li);}
 const detail=document.createElement('p');detail.className='analytics-definition';detail.textContent='Same invitations, in order, within this period. “Sent” includes copied links and successful shares; it does not prove delivery. Existing players can accept. Opens are omitted here so blocked view tracking does not hide confirmed acceptance.';invite.append(flow,detail);content.append(invite);
 card('Seven-day return','DO PEOPLE COME BACK?',p=>percentage(p.retained,p.retentionEligible),`Registered players who were active on the seventh UTC calendar day after signup. The signup window is shifted seven days earlier than the selected period; only cohorts whose entire seventh day has elapsed are included. Eligible accounts: ${data.current.retentionEligible}. This is day-seven retention, not “returned at any point within a week.”`,true,7);
}
export function state(title:string,copy:string,signIn=false){content.replaceChildren();const panel=document.createElement('div');panel.className='analytics-empty';const icon=document.createElement('div');icon.className='analytics-empty-icon';icon.textContent='↗';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=copy;panel.append(icon,h,p);if(signIn){const button=document.createElement('button');button.type='button';button.textContent='Sign in';button.onclick=()=>signInDialog(load);panel.append(button);}content.append(panel);}
let sequence=0;
async function load(){const current=++sequence;refresh.disabled=true;status.textContent='Checking your analytics…';content.replaceChildren();
 try{
  const client=authClient();const session=client?(await client.auth.getSession()).data.session:null;
  if(current!==sequence)return;
  if(!session||session.user.is_anonymous){status.textContent='Private dashboard';state('Sign in to continue','Use your PickleBash admin account to view analytics.',true);return;}
  const response=await fetch(`/api/admin/analytics?days=${range.value}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
  const data=await response.json();if(current!==sequence)return;
  if(response.status===401){status.textContent='Session expired';state('Sign in again','Your session has expired. Sign in to continue.',true);return;}
  if(response.status===403){status.textContent='Private dashboard';state('Admin access required','Your current account does not have access. Sign in with your admin account to continue.',true);return;}
  if(!response.ok)throw Error('unavailable');
  if(data.status==='setup'){status.textContent='Setup needed · No numbers shown';state('Connect analytics','Your dashboard is ready. Add the read-only PostHog query key and project ID to the server configuration to load real activity.');return;}
  renderDashboard(data);
 }catch{if(current===sequence){status.textContent='Could not update';state('The numbers are taking a break','Analytics is temporarily unavailable. Try Refresh in a moment. This does not affect the game.');}}
 finally{if(current===sequence)refresh.disabled=false;}
}
refresh.onclick=()=>void load();range.onchange=()=>void load();
// Immediately remove sensitive aggregates on sign-out/account switch, then reauthorize.
if(!document.documentElement.hasAttribute('data-analytics-preview')){
 authClient()?.auth.onAuthStateChange(()=>{sequence++;content.replaceChildren();setTimeout(()=>void load(),0);});
 void load();
}
