import {COURT_LOCATIONS,isPremiumCourt,type CourtLocation} from './locations';
import './court-selector.css';
export function courtPremiumBadge(court:CourtLocation){return isPremiumCourt(court)?'<small class="court-premium-badge">Premium</small>':''}
export function courtSelector(selected:CourtLocation,attribute:'data-court'|'data-remote-court'){
 return COURT_LOCATIONS.map(c=>`<button type="button" ${attribute}="${c.id}" aria-pressed="${selected===c.id}"><img src="${c.image}" alt="" draggable="false">${courtPremiumBadge(c.id)}<strong>${c.id==='venice'?'The Beach':c.name}</strong></button>`).join('');
}
export const courtShuffleButton='<button type="button" class="court-shuffle" data-action="shuffle-court" aria-label="Shuffle court" title="Shuffle court"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h3c4 0 8 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6s4-6 6-6h3m-4-4 4 4-4 4"/></svg></button>';
export function randomCourt(current?:CourtLocation):CourtLocation{
 const choices=COURT_LOCATIONS.filter(c=>c.id!==current);
 return choices[Math.floor(Math.random()*choices.length)].id;
}
export function scrollToCourt(button:HTMLElement){
 const strip=button.closest<HTMLElement>('.court-selector');if(!strip)return;
 const court=button.getBoundingClientRect(),bounds=strip.getBoundingClientRect();
 strip.scrollTo({left:strip.scrollLeft+court.left-bounds.left-(strip.clientWidth-court.width)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
