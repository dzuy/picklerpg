import config from './xp-config.json';
import {SKILLS,type PlayerSkills} from './engine/model';
import {SUMMARY_SKILLS,type SummarySkillName,setSummarySkillLevel} from './player-skill-summary';
export const STARTING_SKILL_POINTS=config.STARTING_SKILL_BUDGET,MAX_SKILL_POINTS=config.MAX_SKILL_BUDGET;
export const skillCap=(_budget:number)=>100;
export function areaPoints(skills:PlayerSkills,name:SummarySkillName){const keys=SUMMARY_SKILLS[name];return Math.ceil(keys.reduce((sum,k)=>sum+skills[k],0)/(keys.length*10));}
export function usedSkillPoints(skills:PlayerSkills){return (Object.keys(SUMMARY_SKILLS) as SummarySkillName[]).reduce((sum,name)=>sum+areaPoints(skills,name),0);}
export function fitsSkillBudget(skills:PlayerSkills,budget=35){return SKILLS.every(k=>Number.isInteger(skills[k])&&skills[k]>=0&&skills[k]<=skillCap(budget))&&usedSkillPoints(skills)<=budget;}
/** Proportional normalization preserves strengths and never increases an existing skill. */
export function normalizeSkillBudget(skills:PlayerSkills,budget=35):PlayerSkills{
 const next={...skills};for(const k of SKILLS)next[k]=Math.min(skillCap(budget),Math.max(0,Math.round(next[k])));
 if(usedSkillPoints(next)<=budget)return next;
 const total=usedSkillPoints(next);for(const k of SKILLS)next[k]=Math.floor(next[k]*budget/total);
 while(usedSkillPoints(next)>budget){const name=(Object.keys(SUMMARY_SKILLS) as SummarySkillName[]).sort((a,b)=>areaPoints(next,b)-areaPoints(next,a))[0];const keys=SUMMARY_SKILLS[name];const key=[...keys].sort((a,b)=>next[b]-next[a])[0];next[key]--;}
 return next;
}
export function allocateArea(skills:PlayerSkills,name:SummarySkillName,points:number,budget=35){const available=budget-usedSkillPoints(skills)+areaPoints(skills,name);return setSummarySkillLevel(skills,name,Math.max(0,Math.min(skillCap(budget)/10,available,Math.round(points)))*10);}
export function allocateDetail(skills:PlayerSkills,key:typeof SKILLS[number],value:number,budget=35){const next={...skills};next[key]=Math.max(0,Math.min(skillCap(budget),Math.round(value)));while(next[key]>skills[key]&&!fitsSkillBudget(next,budget))next[key]--;return next;}
export function randomBudgetSkills(budget=35,random:()=>number=Math.random):PlayerSkills{
 const names=Object.keys(SUMMARY_SKILLS) as SummarySkillName[],points=Object.fromEntries(names.map(n=>[n,0])) as Record<SummarySkillName,number>;
 for(let i=0;i<budget;i++){const choices=names.filter(n=>points[n]<skillCap(budget)/10);points[choices[Math.floor(random()*choices.length)]]++;}
 let skills=Object.fromEntries(SKILLS.map(k=>[k,0])) as PlayerSkills;for(const n of names)skills=setSummarySkillLevel(skills,n,points[n]*10);return skills;
}
