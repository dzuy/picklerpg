import {matchCredentials} from '../auth-session';
import {remoteRequest} from './api';
import {SHOT_TYPES} from '../engine/model';
import type {ShotMixDashboard,ShotMixFilter} from './shot-mix';
import './shot-mix.css';
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text=''){const e=document.createElement(tag);e.textContent=text;return e;}
export function shotMixPanel(){
 const panel=node('details');panel.className='shot-mix-panel';panel.append(node('summary','Shot Mix'));
 const intro=node('p','Your recorded choices in completed online games. Early exits and solo play are excluded.');
 const controls=node('div');controls.className='shot-mix-filters';
 function select(label:string,options:Array<[string,string]>){const wrap=node('label',label),input=node('select');for(const [value,text] of options){const o=node('option',text);o.value=value;input.append(o);}wrap.append(input);controls.append(wrap);return input;}
 const scope=select('Games',[['recent','Last 10'],['month','Last 30 days'],['lifetime','Lifetime']]),opponent=select('Opponent',[['','All opponents']]),athlete=select('Athlete',[['','Both athletes']]),stage=select('Stage',[['all','All stages'],['serve','Serve'],['return','Return'],['third','Third shot'],['fourth','Fourth shot'],['later','Fifth shot onward'],['unknown','Unknown stage']]);
 const status=node('p');status.setAttribute('role','status');const content=node('div');const refresh=node('button','Refresh shot mix');refresh.type='button';
 panel.append(intro,controls,refresh,status,content);let generation=0,loaded=false,owner='';
 function options(select:HTMLSelectElement,items:Array<{id:string;name:string}>){const value=select.value;select.querySelectorAll('option:not(:first-child)').forEach(o=>o.remove());const duplicates=new Map<string,number>();for(const item of items){const n=(duplicates.get(item.name)??0)+1;duplicates.set(item.name,n);const o=node('option',item.name+(n>1?` (${n})`:''));o.value=item.id;select.append(o);}select.value=value;}
 async function load(){const revision=++generation;status.textContent='Loading shot mix…';content.replaceChildren();refresh.disabled=true;
  try{const c=await matchCredentials();if(owner&&owner!==c.owner)throw Error('Account changed. Reopen your profile.');owner=c.owner;
   const params=new URLSearchParams({scope:scope.value,stage:stage.value});if(opponent.value)params.set('opponent',opponent.value);if(athlete.value)params.set('athlete',athlete.value);
   const data=await remoteRequest<ShotMixDashboard>(c.token,`/api/multiplayer/shot-mix?${params}`);
   const after=await matchCredentials();if(revision!==generation||!panel.isConnected)return;if(after.owner!==owner)throw Error('Account changed. Reopen your profile.');
   if(data.definitionVersion!=='shot-mix-1')throw Error('Shot mix needs an update. Refresh the page.');
   options(opponent,data.opponents);options(athlete,data.athletes);draw(data);loaded=true;status.textContent='';
  }catch(e){if(revision===generation)status.textContent=(e as Error).message;}
  finally{if(revision===generation)refresh.disabled=false;}
 }
 function draw(data:ShotMixDashboard){
  const s=data.totals;content.replaceChildren(node('h3',`${s.selections} recorded selections`),node('p',`${s.matches} games · ${s.available} summaries available · ${s.complete} with complete history`));
  if(s.available<s.matches||s.complete<s.matches)content.append(node('p','History is incomplete. Missing summaries are excluded; selections without menu context do not contribute to opportunity rates.'));
  if(!s.matches){content.append(node('p','Finish an online game to start your shot mix, or choose a wider filter.'));return;}
  if(s.ruleSets.length>1||s.engineVersions.length>1)content.append(node('p','These games include different rules or game versions. Comparisons describe choices across those conditions.'));
  const opening=s.families.serve.selected+s.families.return.selected,rally=s.selections-opening;
  content.append(node('p',`Opening shots: ${s.families.serve.selected} serves · ${s.families.return.selected} returns. Rally selections: ${rally}.`));
  content.append(node('p',`When offered: serves ${s.families.serve.selectedWhenEligible}/${s.families.serve.eligible} · returns ${s.families.return.selectedWhenEligible}/${s.families.return.eligible}. Zero denominators mean no recorded opportunities.`));
  const table=node('table'),caption=node('caption','Rally shot mix');table.append(caption);
  const head=node('tr');for(const label of ['Shot','Selections','Share','When offered']){const th=node('th',label);th.scope='col';head.append(th);}table.append(head);
  for(const type of SHOT_TYPES){if(type==='serve'||type==='return')continue;const f=s.families[type];if(!f.selected&&!f.eligible)continue;
   const row=node('tr');row.append(node('th',type),node('td',String(f.selected)));
   const share=node('td');if(rally){const bar=node('meter');bar.min=0;bar.max=rally;bar.value=f.selected;bar.setAttribute('aria-label',`${type} share of rally selections`);share.append(bar,node('span',`${Math.round(100*f.selected/rally)}%`));}else share.textContent='—';
   row.append(share,node('td',f.eligible?`${f.selectedWhenEligible} / ${f.eligible} (${Math.round(100*f.selectedWhenEligible/f.eligible)}%)`:'No recorded opportunities'));table.append(row);
  }
  content.append(table,node('p','Share uses recorded rally selections. “When offered” uses decisions where that family appeared in your menu, counted once per decision. Different families can be offered together.'));
  content.append(node('h3','Recent choices'),node('p',`Last ${data.recent.matches} matching games compared with the previous ${data.previous.matches}. This comparison always uses the latest 20 matching games, regardless of the Games filter.`));
  if(!data.previous.matches){content.append(node('p','More completed games are needed for a previous group. Counts remain available above.'));return;}
  content.append(node('p',`${data.recent.complete} recent and ${data.previous.complete} previous games have complete history. Rates use only recorded opportunities.`));
  const list=node('ul');
  for(const t of SHOT_TYPES){if(t==='serve'||t==='return')continue;const a=data.previous.families[t],b=data.recent.families[t];if(!a.selected&&!b.selected&&!a.eligible&&!b.eligible)continue;
   const rates=a.eligible>=10&&b.eligible>=10?` · ${Math.round(100*a.selectedWhenEligible/a.eligible)}% → ${Math.round(100*b.selectedWhenEligible/b.eligible)}% when offered`:' · fewer than 10 opportunities in at least one group';
   list.append(node('li',`${t}: ${a.selectedWhenEligible}/${a.eligible} → ${b.selectedWhenEligible}/${b.eligible}${rates}`));
  }
  content.append(list,node('p','These are descriptive comparisons, not recommendations or evidence of improvement. Opponents and available situations may differ.'));
 }
 for(const input of [scope,opponent,athlete,stage])input.onchange=()=>void load();refresh.onclick=()=>void load();panel.addEventListener('toggle',()=>{if(panel.open&&!loaded)void load();});return panel;
}
