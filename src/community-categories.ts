import type {PlayerSkills} from './engine/model';
import {SUMMARY_SKILLS,setSummarySkillLevel,type SummarySkillName} from './player-skill-summary';
const mean=(skills:PlayerSkills,area:SummarySkillName)=>SUMMARY_SKILLS[area].reduce((sum,key)=>sum+skills[key],0)/SUMMARY_SKILLS[area].length;
/** Add future collections here; each defines its own membership rule and row copy. */
export const COMMUNITY_CATEGORIES=[
 {id:'bangers',title:'Bangers',description:'Big drives, strong serves, and overhead putaways.',score:(s:PlayerSkills)=>mean(s,'Power'),points:{Power:9,Control:6,Speed:7,Hands:7,Defense:6}},
 {id:'fast-hands',title:'Fast Hands',description:'Quick volleys and counters at the kitchen.',score:(s:PlayerSkills)=>mean(s,'Hands'),points:{Power:6,Control:6,Speed:8,Hands:9,Defense:6}},
 {id:'defensive-walls',title:'Defensive Walls',description:'Reliable returns, soft resets, and patient control.',score:(s:PlayerSkills)=>mean(s,'Defense'),points:{Power:5,Control:8,Speed:7,Hands:6,Defense:9}},
] as const;
export type CommunityCategoryId=typeof COMMUNITY_CATEGORIES[number]['id'];
export function communityCategory(skills:PlayerSkills){return [...COMMUNITY_CATEGORIES].sort((a,b)=>b.score(skills)-a.score(skills))[0];}
/** Balanced, deliberate public starter builds; variation changes supporting strengths. */
export function communityCategorySkills(id:CommunityCategoryId,variant=0):PlayerSkills{
 const category=COMMUNITY_CATEGORIES.find(c=>c.id===id)!;
 const points:Record<SummarySkillName,number>={...category.points};
 if(variant%2){points.Control--;points.Speed++;}
 let skills={} as PlayerSkills;
 for(const area of Object.keys(SUMMARY_SKILLS) as SummarySkillName[])skills=setSummarySkillLevel(skills,area,points[area]*10);
 return skills;
}
