import type {PlayerSkills} from './engine/model';
import {SUMMARY_SKILLS,setSummarySkillLevel,summarizeSkills,type SummarySkillName} from './player-skill-summary';
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

/** Curated public opponents span intermediate through strong, retaining their specialty. */
export const COMMUNITY_RATINGS=[3.5,3.7,3.9,4.1,4.3,4.5,4.65,4.8] as const;
export const CURATED_COMMUNITY_BUDGET=50;
export function communityRatedSkills(id:CommunityCategoryId,rating:number,variant=0):PlayerSkills{
 return skillsAtCommunityRating(communityCategorySkills(id,variant),rating);
}
export function skillsAtCommunityRating(base:PlayerSkills,rating:number):PlayerSkills{
 if(!Number.isFinite(rating)||rating<3.5||rating>4.8)throw Error('Community rating must be between 3.5 and 4.8');
 const id=communityCategory(base).id;
 const build=(offset:number)=>Object.fromEntries(Object.entries(base).map(([key,value])=>[key,Math.max(0,Math.min(100,Math.round(value+offset)))])) as PlayerSkills;
 let low=-100,high=100;
 for(let i=0;i<24;i++){const mid=(low+high)/2;if(summarizeSkills(build(mid)).estimatedDupr<rating)low=mid;else high=mid;}
 const a=build(low),b=build(high);
 let skills=Math.abs(summarizeSkills(a).estimatedDupr-rating)<=Math.abs(summarizeSkills(b).estimatedDupr-rating)?a:b;
 // Fine tune individual skills so integer engine values still display the target rating.
 for(let i=0;i<50;i++){
  const actual=summarizeSkills(skills).estimatedDupr,direction=actual<rating?1:-1;
  const candidates=Object.keys(skills).map(key=>({...skills,[key]:skills[key as keyof PlayerSkills]+direction})).filter(s=>Object.values(s).every(v=>v>=0&&v<=100)&&communityCategory(s).id===id);
  const best=candidates.sort((x,y)=>Math.abs(summarizeSkills(x).estimatedDupr-rating)-Math.abs(summarizeSkills(y).estimatedDupr-rating))[0];
  if(!best||Math.abs(summarizeSkills(best).estimatedDupr-rating)>=Math.abs(actual-rating))break;
  skills=best;
 }
 return skills;
}
