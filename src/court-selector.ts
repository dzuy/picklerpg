import {COURT_LOCATIONS,type CourtLocation} from './locations';
import './court-selector.css';
export function courtSelector(selected:CourtLocation,attribute:'data-court'|'data-remote-court'){
 return COURT_LOCATIONS.map(c=>`<button type="button" ${attribute}="${c.id}" aria-pressed="${selected===c.id}"><img src="${c.image}" alt="" draggable="false"><strong>${c.id==='venice'?'The Beach':c.name}</strong></button>`).join('');
}
