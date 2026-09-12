import type {PlayerId,PlayerState,ShotIntent,ShotType} from './model';
import type {ShotContext} from './shot-families';
export const COMMAND_SCHEMA={type:'object',properties:{shot:{type:'string',enum:['serve','return','drive','drop','dink','reset','volley','counter','block','overhead','lob','roll','lob-serve']},target:{type:'string',enum:['middle','wide','line','crosscourt','open-court','left','right','jules','rio']},aim:{type:'string',enum:['space','body','feet','backhand','behind']},pace:{type:'string',enum:['soft','medium','fast']}},required:['shot','target','aim','pace'],additionalProperties:false};
export interface ParsedCommand {shot:ShotType|'roll'|'lob-serve';target:string;aim:string;pace:ShotIntent['pace']}
export function requestsBounce(text:string):boolean{return /\b(?:let|allow|wait(?:\s+for)?)\b.{0,40}\bbounce\b|\bbounce\b.{0,24}\b(?:then|before)\b/i.test(text)}
export function validateCommand(value:unknown):ParsedCommand{if(!value||typeof value!=='object'||Object.keys(value).length!==4)throw new Error('Unrecognized command response.');for(const [key,schema] of Object.entries(COMMAND_SCHEMA.properties))if(!schema.enum.includes((value as Record<string,string>)[key]))throw new Error('Unrecognized command response.');return value as ParsedCommand}
export function parseLocalCommand(text:string):ParsedCommand{
 const t=text.toLowerCase().trim();if(t.length>300||!t)throw new Error('Use a command of 1–300 characters.');
 if(/\b(him|her|his|them)\b/.test(t)&&! /\b(left|right|jules|rio)\b/.test(t))throw new Error('Name Jules or Rio, or say left/right player.');
 const nelson=/\bnasty[ -]+nelson\b/.test(t);
 const shot=nelson?'serve':/\bserve\b/.test(t)&&/\b(lob|high|lofted)\b/.test(t)?'lob-serve':/\broll\b/.test(t)?'roll':/\b(lob)\b/.test(t)?'lob':/\b(overhead|smash)\b/.test(t)?'overhead':/\b(dink)\b/.test(t)?'dink':/\b(drop)\b/.test(t)?'drop':/\b(reset)\b/.test(t)?'reset':/\b(block)\b/.test(t)?'block':/\b(counter)\b/.test(t)?'counter':/\b(volley)\b/.test(t)?'volley':/\b(return)\b/.test(t)?'return':/\b(serve)\b/.test(t)?'serve':/\b(drive|rip|jam|body bag|speed.?up)\b/.test(t)?'drive':null;
 if(!shot)throw new Error('Name a shot, such as lob, dink, drive, drop or roll.');
 const target=/\bjules\b/.test(t)?'jules':/\brio\b/.test(t)?'rio':/\bleft\b/.test(t)?'left':/\bright\b/.test(t)?'right':/\bwide\b/.test(t)?'wide':/\bline\b/.test(t)?'line':/\bcrosscourt\b/.test(t)?'crosscourt':/\b(open|gap)\b/.test(t)?'open-court':/\bmiddle\b/.test(t)?'middle':shot==='serve'||shot==='lob-serve'?'crosscourt':'middle';
 const aim=nelson?'body':/\bbackhand\b/.test(t)?'backhand':/\bfeet\b/.test(t)?'feet':/\bbehind\b/.test(t)?'behind':/\b(body|hip|jam)\b/.test(t)?'body':'space';
 if(aim!=='space'&&!['left','right','jules','rio'].includes(target))throw new Error('Specify left/right player, Jules or Rio for that target.');
 return {shot,target,aim,pace:nelson?'fast':/\b(hard|fast|rip|aggressive)\b/.test(t)?'fast':/\bsoft\b/.test(t)||['drop','dink','reset','block','lob','lob-serve'].includes(shot)?'soft':'medium'};
}
export function commandIntent(parsed:ParsedCommand,actor:PlayerId,c:ShotContext,players:PlayerState[]):{intent:ShotIntent;note:string}{
 const p=validateCommand(parsed),opponents=players.filter(p=>p.team!==players.find(a=>a.id===actor)!.team).sort((a,b)=>a.position.x-b.position.x);
 const targetPlayer=p.target==='jules'?players.find(p=>p.id==='opponent-left'):p.target==='rio'?players.find(p=>p.id==='opponent-right'):p.target==='left'?opponents[0]:p.target==='right'?opponents[1]:undefined;
 const type:ShotType=p.shot==='lob-serve'?'serve':p.shot==='roll'?(c.bounced?'drive':'volley'):p.shot;
 const soft=['drop','dink','reset','block'].includes(type);
 let target:ShotIntent['target']={kind:'zone',zone:p.target as 'middle',depth:soft?'kitchen':'deep'};
 let note=p.shot==='roll'?'Roll uses a forward drive/volley approximation; spin is not simulated.':'';
 if(targetPlayer){
  if(p.aim==='body'||p.aim==='feet')target={kind:'player',playerId:targetPlayer.id,aim:p.aim};
  else if(p.aim==='backhand'&&!soft&&type!=='lob')target={kind:'player',playerId:targetPlayer.id,aim:'backhand-side'};
  else {target={kind:'zone',zone:targetPlayer.position.x*c.contact.x>=0?'line':'crosscourt',depth:soft&&p.aim!=='behind'?'kitchen':'deep'};note+=' Player-side landing approximates the requested lane; it is not an exact point target.'}
 }
 return {intent:{schemaVersion:1,actor,type,target,pace:p.pace,shape:type==='serve'&&p.aim==='body'?'flat':type==='overhead'?'descending':soft||type==='lob'||type==='serve'||type==='return'?'arc':'flat',intendedNetClearance:p.shot==='lob-serve'?2.5:soft?.25:.12,tacticalIntent:type==='overhead'?'finish':soft?'neutralize':'pressure',aggression:p.pace==='fast'?.8:.4,source:'text'},note:note.trim()};
}

/** Only claim instant understanding for the deliberately supported vocabulary. */
export function canParseInstantly(text:string):boolean{
 const words=text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
 const known=new Set('nasty nelson side serve high lofted return drive drop dink reset volley counter block overhead smash lob roll rip jam body bag speed up middle wide line crosscourt open court gap left right jules rio feet backhand behind hip hard fast aggressive soft medium the a an at to it ball player opponent with on his her him them please my their deep down over let allow wait for bounce then first before after'.split(' '));
 if(words.some(w=>!known.has(w)))return false;
 if(/\b(not|don t|instead|or)\b/i.test(text)||(/\bthen\b/i.test(text)&&!requestsBounce(text)))return false;
 try{parseLocalCommand(text);return true}catch{return false}
}
