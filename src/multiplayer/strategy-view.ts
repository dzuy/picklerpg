import {parseStrategyStory,strategyStoryCopy} from './strategy-story';
import {SHOT_TYPES} from '../engine/model';
import {publicStrategy,type MatchStrategy} from './strategy';
/** Secondary detail keeps Rematch the primary completion action. */
export function strategyDetails(value:MatchStrategy|undefined):HTMLElement{
 const details=document.createElement('details');details.className='strategy-details';
 const title=document.createElement('summary');title.textContent='Your shot selections';details.append(title);
 const text=(message:string)=>{const p=document.createElement('p');p.textContent=message;details.append(p);};
 let s:MatchStrategy;try{if(!value)throw Error();s=publicStrategy(value);}catch{text('Shot summary is unavailable right now. Reopen this game to retry.');return details;}
 text(`${s.selections} recorded selections${s.executed===null?'':` · ${s.executed} executed shots`}. These describe your choices, not why you won or lost.`);
 if(!s.coverage.complete)text(`Partial history: ${s.coverage.recordedSelections} of ${s.coverage.expectedSelections} game decisions recorded; ${s.coverage.contextSelections} include opportunity context. Missing context is excluded from opportunity counts.`);
 if(!s.selections){text('No selections for you are present in the available history.');return details;}
 const table=document.createElement('table');const caption=document.createElement('caption');caption.textContent='Your selections and available choices';table.append(caption);
 const header=document.createElement('tr');for(const name of ['Shot','Selected','When offered']){const th=document.createElement('th');th.scope='col';th.textContent=name;header.append(th);}table.append(header);
 for(const t of SHOT_TYPES){const f=s.families[t];if(!f.selected&&!f.eligible)continue;const row=document.createElement('tr');for(const value of [t,String(f.selected),f.eligible?`${f.selectedWhenEligible} / ${f.eligible}`:'—']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}table.append(row);}details.append(table);
 text('When offered = selections of that shot / decisions where it appeared in your menu. Each family counts once per decision. A selection may fail before contact.');
 if(s.rallies.sample)text(`${s.rallies.sample} complete rallies · ${s.rallies.averageContacts!.toFixed(1)} contacts on average · ${s.rallies.longestContacts} longest. Both teams’ contacts are included.`);
 return details;
}

export function strategyStoryDetails(value:unknown,opponent:string):HTMLElement|null {
 let s;try{s=parseStrategyStory(value);}catch{return null;}
 const section=document.createElement('section');section.className='strategy-story';section.setAttribute('aria-label','Your rivalry pattern');
 const headline=document.createElement('p');headline.textContent=strategyStoryCopy(s,opponent);section.append(headline);
 const evidence=document.createElement('details'),label=document.createElement('summary');label.textContent='See the evidence';evidence.append(label);
 for(const [name,w] of [['Latest four',s.recent],['Previous four',s.previous]] as const){const p=document.createElement('p');p.textContent=`${name}: ${w.selected} selections / ${w.eligible} eligible third-shot choices.`;evidence.append(p);const list=document.createElement('ul');for(const m of w.matches){const li=document.createElement('li'),a=document.createElement('a');a.href=`/?openplay=1&match=${encodeURIComponent(m.id)}`;a.textContent=`Game completed ${new Date(m.completedAt).toLocaleString()}`;li.append(a);list.append(li);}evidence.append(list);}
 const note=document.createElement('p');note.textContent='Your choices in games with this friend, with complete opportunity data and matching rules, engine version and your athlete IDs. This describes a selection pattern; it does not explain wins or losses.';evidence.append(note);section.append(evidence);return section;
}
