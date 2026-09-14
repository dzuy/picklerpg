import {SKILLS,type PlayerSkills} from './engine/model';
// Display ratings have their own curve: ordinary roster skills sit near 3.5,
// while the final few skill points represent the much rarer professional tier.
// Execution benchmarks remain responsible for ball physics and error rates.
export const DUPR_SCALE=[
 {skill:0,rating:2},{skill:40,rating:3},{skill:60,rating:3.25},
 {skill:70,rating:3.5},{skill:80,rating:4},{skill:90,rating:5},
 {skill:95,rating:6},{skill:100,rating:8},
] as const;
function ratingForSkill(skill:number){
 const upper=DUPR_SCALE.findIndex(point=>point.skill>=skill);
 const a=DUPR_SCALE[Math.max(0,upper-1)],b=DUPR_SCALE[upper];
 const t=a.skill===b.skill?0:(skill-a.skill)/(b.skill-a.skill);
 return a.rating+(b.rating-a.rating)*t;
}
export const SUMMARY_SKILLS={Power:['serve','drive','overhead'],Control:['return','drop','dink','reset'],Speed:['movement'],Hands:['volley','counter','hands']} as const;
export type SummarySkillName=keyof typeof SUMMARY_SKILLS;
export function setSummarySkillLevel(skills:PlayerSkills,name:SummarySkillName,value:number):PlayerSkills{
 const level=Math.max(0,Math.min(100,Math.round(value))),next={...skills};
 for(const key of SUMMARY_SKILLS[name])next[key]=level;
 return next;
}
export function summarizeSkills(skills:PlayerSkills){
 const meters=Object.fromEntries(Object.entries(SUMMARY_SKILLS).map(([name,keys])=>[name,keys.reduce((sum,key)=>sum+skills[key],0)/keys.length])) as Record<keyof typeof SUMMARY_SKILLS,number>;
 // Each skill contributes equally. A small weakness penalty prevents one specialty
 // from disguising large gaps. This is a game estimate, not DUPR's match algorithm.
 const values=SKILLS.map(key=>skills[key]),mean=values.reduce((sum,n)=>sum+n,0)/values.length;
 const deviation=Math.sqrt(values.reduce((sum,n)=>sum+(n-mean)**2,0)/values.length);
 return {meters,estimatedDupr:ratingForSkill(Math.max(0,Math.min(100,mean-deviation*.15)))};
}
export function skillLevel(value:number){return value<40?'Beginner':value<70?'Developing':value<80?'Intermediate':value<90?'Strong':value<95?'Advanced':'Pro'};
