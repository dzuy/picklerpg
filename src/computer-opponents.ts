import {COMMUNITY_RATINGS,skillsAtCommunityRating} from './community-categories';
import type {DesignedPlayer} from './player-design';

// Stable across catalog ordering, recruiting and public-id aliases. These are
// match-only builds; never save them back to the recruitable community roster.
export function computerOpponent(player:DesignedPlayer):DesignedPlayer{
 const key=player.name.trim().toLowerCase();
 const hash=Array.from(key).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
 const target=COMMUNITY_RATINGS[hash%COMMUNITY_RATINGS.length];
 return {...player,skills:skillsAtCommunityRating(player.skills,target)};
}
