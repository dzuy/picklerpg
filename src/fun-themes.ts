import type {Appearance} from './player-design';
export const FUN_THEMES=[
 {id:'disco',name:'Disco Inferno',colors:['#582c83','#ff77bb','#ffce65'],looks:['Disco Dynamo','Boogie Royal']},
 {id:'eighties',name:"80’s Night",colors:['#272455','#ff70b2','#54e5e0'],looks:['Neon Runner','Miami Rally']},
 {id:'horrified',name:'Spooky',colors:['#393151','#b7e878','#ffae65'],looks:['Funny Bones','Zombie Jamboree']},
 {id:'fairy',name:'Fairy Tales',colors:['#366d70','#c7abf5','#f4aec9'],looks:['Petal Princess','Woodland Fairy']},
] as const;
export type FunThemeId=typeof FUN_THEMES[number]['id'];
export type CourtTheme='none'|FunThemeId;
export const isCourtTheme=(value:unknown):value is CourtTheme=>value==='none'||FUN_THEMES.some(t=>t.id===value);
export function themeOptions(value:CourtTheme='none'){return [{id:'none',name:'None'},...FUN_THEMES].map(t=>`<option value="${t.id}" ${t.id===value?'selected':''}>${t.name}${t.id==='none'?'':' - Premium'}</option>`).join('')}
/** Presets add independent modules; underlying character choices and identity survive. */
export function applyFunTheme(a:Appearance,theme:CourtTheme,variant:0|1=0):Appearance{return {...a,funTheme:theme,funVariant:variant,funPaddle:theme,funOverrides:[]}}

export function customizeFunPiece(a:Appearance,key:string){
 if(!a.funTheme||a.funTheme==='none')return;
 const part=({top:'top',jersey:'top',bottom:'bottom',bottomColor:'bottom',shoeStyle:'shoes',shoes:'shoes',hat:'hat',hatColor:'hat',hairStyle:'hair'} as const)[key as 'top'];
 if(part)a.funOverrides=[...new Set([...(a.funOverrides??[]),part])];
 if(key==='outfit')a.funTheme='none';
 if(key==='paddle'||key==='paddleShape')a.funPaddle='none';
}
