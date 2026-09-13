import {SKILLS,type PlayerSkills} from './engine/model';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';
export interface PlayerLook {name:string;role:string;skills:PlayerSkills;appearance:Appearance}
// Starting Lineup spans beginner through advanced. Values follow SKILLS order:
// serve, return, drive, drop, dink, reset, volley, counter, overhead, movement, hands.
const skills=(values:number[]):PlayerSkills=>Object.fromEntries(SKILLS.map((key,i)=>[key,values[i]])) as PlayerSkills;
const roleSkills:Record<string,PlayerSkills>={
 'All-around':skills([21,22,20,19,23,18,20,18,20,24,21]),
 'Power player':skills([72,47,85,32,29,28,51,45,78,52,40]),
 Strategist:skills([74,86,68,92,90,87,78,71,70,77,81]),
 'Fast moves':skills([88,91,91,88,88,87,92,91,89,99,94]),
 'Net specialist':skills([64,89,57,97,99,96,94,86,64,88,97]),
 Defensive:skills([77,94,70,94,93,99,96,93,76,93,98]),
 Creative:skills([37,43,21,59,40,33,22,16,28,30,20]),
 Versatile:skills([69,73,70,68,72,66,71,67,70,74,73]),
};
const look=(name:string,role:string,color:string,appearance:Partial<Appearance>):PlayerLook=>({name,role,skills:{...roleSkills[role]},appearance:{...DEFAULT_APPEARANCE,face:'oval',skin:'#ffbe91',hair:'#754732',hat:'none',jersey:color,accent:color,hatColor:color,bottomColor:color,shoes:color,paddle:color,...appearance}});
export const LOOKS:PlayerLook[]=[
 look('Emma','All-around','#fa6796',{presentation:'girl',hairStyle:'ponytail',top:'tank',bottom:'skirt'}),
 look('Leo','Power player','#4285df',{presentation:'boy',hairStyle:'short',hat:'cap',top:'jersey',bottom:'shorts',bottomColor:'#fff7ef'}),
 look('Maya','Strategist','#efbf43',{presentation:'girl',skin:'#b7784c',hair:'#252429',hairStyle:'bun',glasses:'square',top:'tank',bottom:'skirt',bottomColor:'#343439'}),
 look('Jax','Fast moves','#e85860',{presentation:'boy',hair:'#efc568',hairStyle:'side-part',top:'jersey',bottom:'shorts',bottomColor:'#343439'}),
 look('Zoe','Net specialist','#fa6796',{presentation:'girl',hair:'#b85b34',hairStyle:'ponytail',hat:'visor',hatColor:'#fff5e8',jersey:'#fff5e8',top:'tank',bottom:'skirt'}),
 look('Cal','Defensive','#424247',{presentation:'boy',skin:'#905635',hair:'#29252a',hairStyle:'short',top:'hoodie',bottom:'shorts'}),
 look('Rina','Creative','#ac7bd8',{presentation:'girl',hair:'#814cac',hairStyle:'bob',top:'tank',bottom:'pleated-skirt'}),
 look('Sam','Versatile','#36936c',{presentation:'boy',hairStyle:'short',hat:'backwards',top:'polo',bottom:'shorts',bottomColor:'#fff7ef'})
];
/** Style buttons choose starting hair/outfit only; every module stays available. */
export function applyPresentation(a:Appearance,presentation:Appearance['presentation']):Appearance{
 return {...a,presentation,hairStyle:presentation==='girl'?'ponytail':'short',top:presentation==='girl'?'tank':'jersey',bottom:presentation==='girl'?'skirt':'shorts'};
}
