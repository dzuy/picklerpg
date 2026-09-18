import {MILESTONES,type ActivityRewards} from '../activity-rewards';
export function activityTitle(activity:ActivityRewards){
 const badge=MILESTONES.find(m=>m.id===activity.title);if(!badge)return null;
 const label=document.createElement('span');label.className='activity-title';label.dataset.color=['mint','gold','sky','violet','rose'][MILESTONES.indexOf(badge)%5];const icon=document.createElement('span');icon.className='activity-title-icon';icon.textContent=badge.icon;icon.setAttribute('aria-hidden','true');const title=document.createElement('span');title.textContent=badge.title;label.append(icon,title);label.title=badge.description;return label;
}
export function activityPanel(activity:ActivityRewards,onSelect?:(id:string)=>Promise<void>){
 const section=document.createElement('section');section.className='activity-rewards';section.setAttribute('aria-label','Activity milestones');
 const heading=document.createElement('h3');heading.textContent='Time on court';
 const stats=document.createElement('p');stats.className='activity-streaks';stats.textContent=`${activity.stats.dayStreak} day streak · ${activity.stats.weekStreak} week streak · ${activity.stats.winStreak} win streak`;
 const best=document.createElement('p');best.className='activity-note';best.textContent=`Personal best: ${activity.stats.bestDayStreak} days · ${activity.stats.bestWeekStreak} weeks · ${activity.stats.bestWinStreak} wins in a row`;
 const note=document.createElement('p');note.className='activity-note';note.textContent='Every completed game counts. Days reset at midnight UTC; weeks begin Monday. Earned badges stay yours when a streak ends.';
 section.append(heading,stats,best,note);
 if(onSelect&&activity.earned.length){const label=document.createElement('label');label.textContent='Your community title';const select=document.createElement('select');for(const milestone of MILESTONES.filter(m=>activity.earned.includes(m.id))){const option=new Option(`${milestone.icon} ${milestone.title}`,milestone.id);select.add(option);}select.value=activity.title??activity.earned[0];const status=document.createElement('p');status.setAttribute('role','status');select.onchange=()=>{const id=select.value;select.disabled=true;void onSelect(id).then(()=>{status.textContent='Title updated.';}).catch(()=>{status.textContent='Could not update your title. Try again.';}).finally(()=>{select.disabled=false;});};label.append(select);section.append(label,status);}
 const grid=document.createElement('div');grid.className='activity-badges';
 for(const m of MILESTONES){const earned=activity.earned.includes(m.id),card=document.createElement('div');card.className=`activity-badge ${earned?'earned':'locked'}`;const icon=document.createElement('span');icon.className='activity-badge-icon';icon.textContent=m.icon;icon.setAttribute('aria-hidden','true');const title=document.createElement('strong');title.textContent=m.title;const description=document.createElement('small');description.textContent=m.description;const progress=document.createElement('span');progress.className='activity-badge-progress';progress.textContent=earned?'✓ Earned':`${Math.min(activity.stats[m.metric],m.target)} / ${m.target}`;card.append(icon,title,description,progress);grid.append(card);}
 section.append(grid);return section;
}
