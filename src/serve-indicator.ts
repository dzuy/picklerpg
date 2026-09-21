import type {PlayerId,Team} from './engine/model';
/** Team rows are viewer-relative in multiplayer. Rally scoring always uses one dot. */
export function serveDotCount(rowTeam:Team,server:PlayerId,serverNumber:1|2,finished=false):0|1|2{
 const serving=server==='you'||server==='partner'?'home':'away';
 return !finished&&rowTeam===serving?serverNumber:0;
}
export function updateServeIndicator(row:HTMLElement,count:0|1|2){
 row.dataset.server=String(count);
 const names=row.querySelector('span')?.textContent??'',score=row.querySelector('b')?.textContent??'';
 row.setAttribute('role','group');
 row.setAttribute('aria-label',`${names}, ${score}${count?`, serving, ${count===2?'second':'first'} server`:''}`);
 row.title=count?`Serving · ${count===2?'Second':'First'} server`:'';
}
