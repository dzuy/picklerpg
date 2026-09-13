import {ARCHETYPES} from './engine/player-profiles';
import {LOOKS} from './player-looks';
import {newPlayer} from './player-design';
const styles=['banger','dinker','lobber','allCourt'] as const;
/** Three distinct looks and specialties; variation preserves each specialty's strengths. */
export function randomLineup(random= Math.random){
 const looks=[...LOOKS],available=[...styles];
 return (['partner','opponent-left','opponent-right'] as const).map(slot=>{
  const look=looks.splice(Math.floor(random()*looks.length),1)[0];
  const archetype=available.splice(Math.floor(random()*available.length),1)[0];
  const level=Math.round(random()*18)-14;
  const profile=ARCHETYPES[archetype];
  const player={...newPlayer(`generated-${slot}`),name:look.name,appearance:{...look.appearance},handedness:random()<.2?'left' as const:'right' as const,skills:{...profile.skills}};
  for(const key of Object.keys(player.skills) as (keyof typeof player.skills)[])player.skills[key]=Math.max(15,Math.min(98,profile.skills[key]+level+Math.round(random()*12)-6));
  return {slot,archetype,player};
 });
}
