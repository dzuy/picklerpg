import type {PlayerState,ShotIntent} from './model';
import type {ShotContext} from './shot-families';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** A soft touch under strain can float up. This is an execution error, not a combo bonus. */
export function popUpChance(intent:ShotIntent,c:ShotContext,player:PlayerState):number{
 if(c.opening!=='rally'||intent.technique||!['dink','reset','drop','block'].includes(intent.type)||c.contact.y>=1.2)return 0;
 const reach=Math.hypot(c.contact.x-c.feet.x,c.contact.z-c.feet.z);
 const backward=clamp((c.movementZ??0)*(player.team==='home'?1:-1)/2);
 const strain=clamp((reach-.45)/.65+clamp(c.timingPressure??0)*.95+backward*.5+clamp((c.incomingSpeed-4)/14)*.25);
 const low=clamp((1.2-c.contact.y)/.8);
 const skill=player.skills[intent.type==='block'?'volley':intent.type as 'dink'|'reset'|'drop'];
 const weakness=.7*(1-skill/100)+.3*(1-player.skills.hands/100);
 // Beginners can float even a comfortable touch; strong players rarely do.
 const baseline=.24*weakness*weakness+.01*weakness;
 // Difficult placement should create a noticeable payoff against weaker control.
 const pressured=strain*(.04+1.05*weakness);
 const control=intent.type==='reset'||intent.type==='block'?.65:1;
 return Math.min(.8,(baseline+pressured)*(.55+.45*low)*control*(intent.pace==='fast'?1.25:1));
}
/** A separate deterministic stream keeps other execution rolls stable. */
export function popUpRoll(seed:number):number{
 let n=(seed^0x71e3a95b)>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);
 return ((n^(n>>>15))>>>0)/4294967296;
}
