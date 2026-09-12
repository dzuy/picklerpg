import type {PlayerId,PlayerSkills,Tendencies} from './model';
export interface PlayerProfile {name:string;description:string;skills:PlayerSkills;tendencies:Tendencies}
const skills=(values:number[]):PlayerSkills=>Object.fromEntries(['serve','return','drive','drop','dink','reset','volley','counter','overhead','movement','hands'].map((key,i)=>[key,values[i]])) as PlayerSkills;
/** Prototype 0–100 execution attributes, not DUPR ratings. */
export const PLAYER_PROFILES:Record<PlayerId,PlayerProfile>={
 you:{name:'You',description:'Balanced skills with room to improve.',skills:skills([70,70,70,70,70,70,70,70,70,70,70]),tendencies:{aggression:.5,middlePreference:.5,kitchenApproach:.5}},
 partner:{name:'Finn',description:'Steady soft game; weaker counters and finishing.',skills:skills([63,70,58,72,74,70,64,48,57,62,60]),tendencies:{aggression:.4,middlePreference:.7,kitchenApproach:.6}},
 'opponent-left':{name:'Jules',description:'Strong drive; vulnerable resets and counters.',skills:skills([64,61,73,49,58,45,60,54,68,58,55]),tendencies:{aggression:.7,middlePreference:.5,kitchenApproach:.5}},
 'opponent-right':{name:'Rio',description:'Reliable dinks; limited pace and court coverage.',skills:skills([57,66,49,67,72,62,57,43,50,51,52]),tendencies:{aggression:.35,middlePreference:.65,kitchenApproach:.5}}
};

export const ARCHETYPES={
 attacker:{name:'Attacker',description:'Drive and finish; softer shots are weaker.',skills:skills([72,64,88,52,58,48,78,80,86,68,78]),tendencies:{aggression:.85,middlePreference:.45,kitchenApproach:.75}},
 setup:{name:'Right-side setup',description:'Drop, dink and set up a partner.',skills:skills([64,76,56,86,86,80,68,55,60,65,70]),tendencies:{aggression:.3,middlePreference:.75,kitchenApproach:.65}},
 grinder:{name:'Grinder',description:'Consistent soft exchanges and court coverage.',skills:skills([62,80,62,76,88,78,64,58,58,84,68]),tendencies:{aggression:.35,middlePreference:.7,kitchenApproach:.5}},
 allCourt:{name:'All-court',description:'Balanced tools without a dominant specialty.',skills:skills([74,74,74,74,74,74,74,74,74,74,74]),tendencies:{aggression:.55,middlePreference:.5,kitchenApproach:.6}},
 defender:{name:'Defensive reset',description:'Absorb attacks; less finishing power.',skills:skills([60,78,50,78,76,92,76,62,52,78,88]),tendencies:{aggression:.2,middlePreference:.8,kitchenApproach:.4}}
} satisfies Record<string,Omit<PlayerProfile,'name'> & {name:string}>;
