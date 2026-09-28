import {matchCredentials} from './auth-session';
import {apiUrl} from './native-origin';
import {showViewDialog} from './view-focus';
import type {FullGameAnalysis} from './game-analysis-model';
import './full-game-analysis.css';

type AnalysisGame={id:string;mode:'solo'|'friends';endedEarly?:boolean};
export function installFullGameAnalysis(host:HTMLElement,getGame:()=>AnalysisGame|null,before?:()=>Promise<void>){
 const button=document.createElement('button');button.type='button';button.className='full-analysis-button';
 button.innerHTML='<span class="full-analysis-icon" aria-hidden="true">✦</span><span><strong>Full Game Analysis</strong><small>Your game. The good stuff. The next move.</small></span><span class="full-analysis-premium">Premium</span>';
 button.setAttribute('aria-haspopup','dialog');host.before(button);
 button.onclick=()=>{
  const game=getGame();if(!game)return;
  openFullGameAnalysis(game,button,before);
 };
 return button;
}
export function openFullGameAnalysis(game:AnalysisGame,trigger:HTMLElement,before?:()=>Promise<void>){
  const dialog=document.createElement('dialog');dialog.className='full-analysis-dialog';dialog.setAttribute('aria-labelledby','full-analysis-title');
  dialog.innerHTML='<header class="full-analysis-header"><div><span class="full-analysis-eyebrow">PICKLEBASH PREMIUM</span><h2 id="full-analysis-title">Full Game Analysis</h2></div><button type="button" aria-label="Close analysis">✕</button></header><div class="full-analysis-content"></div>';
  document.body.append(dialog);const content=dialog.querySelector<HTMLDivElement>('.full-analysis-content')!;
  let controller:AbortController|null=null;
  const close=dialog.querySelector<HTMLButtonElement>('header button')!;close.onclick=()=>dialog.close();
  showViewDialog(dialog);dialog.addEventListener('close',()=>{controller?.abort();dialog.remove();trigger.focus({preventScroll:true})},{once:true});
  const message=(heading:string,copy:string)=>{content.replaceChildren();const h=document.createElement('h3'),p=document.createElement('p');h.textContent=heading;p.textContent=copy;content.append(h,p);};
  const progress=(heading:string,copy:string)=>{
   renderFullGameAnalysisProgress(content,heading,copy);
  };
  async function request<T>(path:string,token:string,body?:unknown):Promise<T>{
   const response=await fetch(apiUrl(path),{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.any([controller!.signal,AbortSignal.timeout(50000)]),cache:'no-store'});
   const value=await response.json();if(!response.ok)throw new Error(value.error?.message??'Your analysis is unavailable. Try again shortly.');return value;
  }
  async function load(){
   controller?.abort();controller=new AbortController();content.setAttribute('aria-busy','true');
   progress('Getting your game ready…','Checking your Premium access and gathering the action.');
   try{
    if(game!.endedEarly){message('Every story needs a finish.','Finish a game to unlock its post-game breakdown.');return;}
    const credentials=await matchCredentials();
    const access=await request<{premium:boolean;available:boolean}>('/api/multiplayer/game-analysis/access',credentials.token);
    if(!dialog.open)return;
    if(!access.premium){
     message('There’s a story behind that score.','Meet your post-game coach: sharp reads, big moments, and one more reason to hit Rematch.');
     const list=document.createElement('ul');for(const [title,copy] of [['The game within the game','What worked, what got answered, and why.'],['Your signature moves','The counters, fireballs, and sneaky placements that shaped the action.'],['A smarter rematch','One specific adjustment to take back to the court.']]){const item=document.createElement('li'),strong=document.createElement('strong'),p=document.createElement('p');strong.textContent=title;p.textContent=copy;item.append(strong,p);list.append(item);}content.append(list);
     const note=document.createElement('p');note.className='full-analysis-note';note.textContent='Included with Premium. Premium access is not enabled for your account yet.';content.append(note);return;
    }
    progress('Opening the shot book…','Gathering your recorded rallies, shots, and player matchups.');
    try{await before?.()}catch{throw new Error('Your game is still syncing. Give it a moment, then try again.')}if(!dialog.open)return;
    progress('Opening your game analysis…','Loading your saved report, or preparing and saving your first breakdown. This may take a little time.');
    const result=await request<FullGameAnalysis>('/api/multiplayer/game-analysis',credentials.token,{gameId:game!.id,mode:game!.mode});
    if(!dialog.open)return;
    renderFullGameAnalysis(content,result);
   }catch(error){if(!dialog.open)return;message('Let’s run that back.',error instanceof Error?error.message:'Your breakdown couldn’t load.');const retry=document.createElement('button');retry.type='button';retry.className='full-analysis-retry';retry.textContent='Try again';retry.onclick=()=>void load();content.append(retry);}
   finally{content.removeAttribute('aria-busy');content.removeAttribute('role');content.removeAttribute('aria-live');}
  }
  void load();
}
export function renderFullGameAnalysisProgress(host:HTMLElement,heading='Your game, under the microscope…',copy='Reviewing the rallies, spotting your signature moves, and finding your next edge. This may take a little time.'){
 const spinner=document.createElement('div');spinner.className='full-analysis-spinner';spinner.setAttribute('aria-hidden','true');
 const h=document.createElement('h3'),p=document.createElement('p');h.textContent=heading;p.textContent=copy;
 host.replaceChildren(spinner,h,p);host.setAttribute('role','status');host.setAttribute('aria-live','polite');
}
function reportElement<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''){
 const el=document.createElement(tag);el.textContent=text;el.className=className;return el;
}
export function renderFullGameAnalysis(host:HTMLElement,{report,coverage,shotStats}:FullGameAnalysis){
 host.replaceChildren();
 const modern='formatVersion' in report&&report.formatVersion===2;
 const hero=reportElement('div','','analysis-hero');
 hero.append(reportElement('span','YOUR COURTSIDE DEBRIEF','full-analysis-eyebrow'),reportElement('h3',report.headline),reportElement('p',report.summary,'analysis-summary'));
 host.append(hero);
 const stats=reportElement('div','','full-analysis-stats');
 for(const [amount,label] of [[coverage.rallies,'Recorded rallies'],[coverage.shots,'Recorded shots'],[coverage.fireballs,'Fireballs']] as const){const stat=reportElement('div');stat.append(reportElement('strong',String(amount)),reportElement('span',label));stats.append(stat)}
 host.append(stats);
 if(!coverage.complete)host.append(reportElement('p','Partial recording · These insights and counts cover the available rallies.','full-analysis-note'));
 const story=reportElement('section','','analysis-story');story.append(reportElement('span','THE STORY OF YOUR GAME','full-analysis-eyebrow'));
 if(modern)story.append(reportElement('h4',report.storyHeadline),reportElement('p',report.storySubheadline,'analysis-story-dek'));
 else story.append(reportElement('h4',report.headline));
 story.append(reportElement('p',report.story));host.append(story);
 const group=(title:string,icon:string,tone:string,points:Array<{title:string;detail:string;action?:string}>)=>{
  const section=reportElement('section','',`analysis-coaching analysis-${tone}`),heading=reportElement('h4');
  const symbol=reportElement('span',icon);symbol.setAttribute('aria-hidden','true');heading.append(symbol,document.createTextNode(title));section.append(heading);
  const list=reportElement('ul');
  for(const point of points){const item=reportElement('li');item.append(reportElement('h5',point.title),reportElement('p',point.detail));
   if(point.action){const cue=reportElement('div','','analysis-coach-cue');cue.append(reportElement('strong',tone==='next'?'Your next rep':'Coach’s cue'),reportElement('p',point.action));item.append(cue)}
   list.append(item);
  }
  section.append(list);host.append(section);
 };
 if(modern){
  group('The Good','✦','good',report.good);
  group('Needed Improvements','🔎','improve',report.improvements);
  group('Next For You','🎯','next',report.next);
 }else if('weapons' in report){
  // Reframe the original saved text without inventing advice or regenerating it.
  group('The Good','✦','good',[{title:'Your signature moves',detail:report.weapons},{title:'A rally worth revisiting',detail:report.turningPoint}]);
  group('Needed Improvements','🔎','improve',[{title:'What you were up against',detail:report.opponents}]);
  group('Next For You','🎯','next',[{title:'Take this into the rematch',detail:report.rematchTip}]);
  host.append(reportElement('p','This saved report uses the earlier format. Its original analysis has been preserved.','full-analysis-note'));
 }
 if(shotStats?.length){
  const chart=reportElement('section','','analysis-chart');chart.append(reportElement('span','THE NUMBERS BEHIND THE STORY','full-analysis-eyebrow'),reportElement('h4','Your shot mix'),reportElement('p','Recorded shot counts · Frequency shows choices, not success rate.'));
  const legend=reportElement('p','Your team  /  Opponents','analysis-chart-legend');chart.append(legend);
  const max=Math.max(1,...shotStats.flatMap(row=>[row.you,row.opponents]));
  const list=reportElement('ul','','analysis-shot-bars');
  for(const row of shotStats){const item=reportElement('li');item.append(reportElement('strong',row.type[0].toUpperCase()+row.type.slice(1)));
   for(const [value,label,cls] of [[row.you,'Your team','you'],[row.opponents,'Opponents','opponents']] as const){
    const line=reportElement('div','',`analysis-bar-row analysis-bar-${cls}`);line.append(reportElement('span',label));
    const track=reportElement('span','','analysis-bar-track'),bar=reportElement('i');bar.style.width=`${value/max*100}%`;track.setAttribute('aria-hidden','true');track.append(bar);line.append(track,reportElement('b',String(value)));item.append(line);
   }list.append(item);
  }
  chart.append(list);host.append(chart);
 }
}
