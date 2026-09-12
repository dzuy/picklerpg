import type {GameState,ShotIntent} from './model';
export const PATTERNS=[
 {id:'middle',name:'Pressure middle → finish',cue:'Pressure the seam; finish only if the reply is high.',type:'drive',height:.8,depth:5.5},
 {id:'fifth',name:'Drive → fifth-shot drop',cue:'Drive first, then soften the next low ball to advance.',type:'drive',height:.8,depth:5.8},
 {id:'wide',name:'Pull wide → attack gap',cue:'Move a defender wide, then look for the gap.',type:'dink',height:.75,depth:2.8},
 {id:'behind',name:'Dink behind a shading player',cue:'The opponents shade the middle. Look behind them.',type:'dink',height:.75,depth:2.8},
 {id:'height',name:'Attack high / reset low',cue:'Read contact height before committing to pace.',type:'overhead',height:2.2,depth:3.5},
 {id:'weak',name:'Pressure the weaker defender',cue:'Compare the defenders and move the weaker player.',type:'drive',height:.8,depth:4.8},
 {id:'counter',name:'Counter a speed-up',cue:'Counter a comfortable attack; absorb pressure when stretched.',type:'counter',height:1.1,depth:2.8},
 {id:'split',name:'Exploit one up / one back',cue:'Keep the deeper opponent back rather than feeding the net player.',type:'drive',height:.8,depth:4}
] as const;
export type PatternId=typeof PATTERNS[number]['id'];
export function recognizePatterns(s:GameState):PatternId[]{
 const p=s.ball.position,ids:PatternId[]=['height'];
 if(s.shotIndex===2)ids.push('middle','fifth');
 if(Math.abs(p.z)<3.3)ids.push('wide','behind');
 if(Math.hypot(s.ball.velocity.x,s.ball.velocity.z)>10)ids.push('counter');
 const away=s.players.filter(p=>p.team==='away');if(Math.abs(Math.abs(away[0].position.z)-Math.abs(away[1].position.z))>2)ids.push('split');
 if(Math.abs(away[0].skills.reset-away[1].skills.reset)>10)ids.push('weak');return ids;
}
export function assessChoice(s:GameState,intent:ShotIntent,pattern:PatternId){
 const soft=['drop','dink','reset','block'].includes(intent.type),wide=intent.target.kind==='zone'&&intent.target.zone==='wide';
 if(s.ball.position.y<.6&&!soft)return {label:'Risky',reason:'A low contact leaves little margin for an attack.'};
 if(pattern==='height')return {label:s.ball.position.y>=1.9?(intent.type==='overhead'?'Good choice':'Risky'):soft?'Good choice':'Risky',reason:'Match your pace to the contact height.'};
 if(['wide','behind'].includes(pattern))return {label:wide?'Good choice':'Better target available',reason:'Width can move a middle-shading defender.'};
 if(pattern==='fifth')return {label:s.shotIndex<=2?(intent.type==='drive'?'Good choice':'Risky'):soft?'Good choice':'Risky',reason:'Use pressure first, then soften when the next contact is low.'};
 if(pattern==='middle')return {label:intent.type==='drive'&&intent.target.kind==='zone'&&intent.target.zone==='middle'?'Good choice':soft?'Good choice':'Risky',reason:'Pressure the seam without assuming the reply will pop up.'};
 if(pattern==='counter')return {label:['counter','block','reset'].includes(intent.type)?'Good choice':'Risky',reason:'Choose a compact response to incoming pace.'};
 return {label:'Review target',reason:'Compare the chosen target with defender depth and skills; this position has no automatic verdict.'};
}
export interface PracticeRecord {pattern:PatternId;label:string;reason:string;intent:ShotIntent;shotIndex:number}
