import {COURT_LOCATIONS,isPremiumCourt,type CourtLocation} from './locations';
import {ownsPack,type PackId} from './pack-catalog';

/** Unknown ownership always uses free courts. Exclude the current court on shuffle. */
export function randomCourt(current?:CourtLocation,ownedPacks:readonly PackId[]=[],random=Math.random):CourtLocation{
 const choices=COURT_LOCATIONS.filter(c=>c.id!==current&&(!isPremiumCourt(c.id)||ownsPack(ownedPacks,'court')));
 return choices[Math.floor(random()*choices.length)].id;
}
