import {SKILLS,type PlayerSkills} from './model';
import {skillBenchmark} from './skill-benchmarks';
/** Summarize level-anchored dimensions; weakest dimension modestly limits the whole game. */
export function simulatedDupr(skills:PlayerSkills):number{
 if(SKILLS.some(k=>!Number.isFinite(skills[k])||skills[k]<0||skills[k]>100))throw new Error('Expected all eleven skills between 0 and 100.');
 const mean=(keys:(keyof PlayerSkills)[])=>keys.reduce((n,k)=>n+skillBenchmark(skills[k]).level,0)/keys.length;
 const groups=[mean(['serve','return']),mean(['drop','dink','reset']),mean(['drive','volley','counter','overhead']),mean(['movement','hands'])];
 const overall=groups.reduce((a,b)=>a+b,0)/groups.length;
 return Math.round((overall*.8+Math.min(...groups)*.2)*10)/10;
}
export function simulatedDuprLabel(skills:PlayerSkills){return `Simulated DUPR ≈ ${simulatedDupr(skills).toFixed(1)} · provisional skill estimate, not an official rating`;}
