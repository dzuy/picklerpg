import type {PlayerState,ShotIntent} from './model';
import type {ShotContext} from './shot-families';

/** Seeded intent choice, independent of execution results and miss rolls. */
export function computerPower(intent:ShotIntent,context:ShotContext,player:PlayerState,seed:number):number{
 let hash=(seed^0x51ed270b)>>>0;
 for(const char of `${intent.type}:${intent.pace}`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b)>>>0;
 const roll=(hash^(hash>>>16))>>>0,variation=roll/4294967296;
 const pressure=Math.min(1,Math.max(context.timingPressure??0,context.incomingSpeed/30));
 const aggression=player.tendencies.aggression;
 const shotSkill=player.skills[intent.type==='lob'?'drop':intent.type==='block'||intent.type==='flick'?'volley':intent.type];
 const skill=(['counter','volley','flick','block'].includes(intent.type)?Math.min(shotSkill,player.skills.hands):shotSkill)/100;
 const soft=['drop','dink','reset','block','lob'].includes(intent.type)||intent.pace==='soft';
 if(soft)return Math.round(Math.max(.15,.25+variation*.2+aggression*.08-pressure*.15)*100)/100;
 const attack=['drive','volley','counter','overhead','flick'].includes(intent.type);
 const reach=Math.hypot(context.contact.x-context.feet.x,context.contact.z-context.feet.z);
 const comfortable=(context.timingPressure??0)<.2&&context.incomingSpeed<16&&context.contact.y>=1&&reach<.8;
 // A hittable ball invites an occasional big swing, including by less skilled players.
 if(attack&&!intent.technique&&comfortable&&variation<.06+aggression*.14+skill*.08)return .9+Math.round(variation*1000)%11/100;
 const effort=.46+aggression*.15+skill*.1+variation*.16-pressure*.24-Math.max(0,.85-context.contact.y)*.2-Math.max(0,reach-.6)*.15-(intent.technique?.12:0);
 return Math.round(Math.max(.25,Math.min(.85,effort))*100)/100;
}
