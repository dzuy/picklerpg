import type {PlayerState} from './model';
import type {ShotContext} from './shot-families';
export function contactDifficulty(c:ShotContext,p:PlayerState){
 const side=p.team==='home'?1:-1,reach=Math.hypot(c.contact.x-c.feet.x,c.contact.z-c.feet.z);
 const backhand=(c.contact.x-c.feet.x)*Math.cos(p.facing)*(p.handedness==='right'?1:-1)<-.15;
 const stretched=Math.max(0,Math.min(1,(reach-.6)/1.2));
 const backward=Math.max(0,Math.min(1,(c.movementZ??0)*side/2));
 const low=c.contact.y<.6,transition=Math.abs(c.contact.z)>3&&Math.abs(c.contact.z)<6;
 const labels=[stretched>.1?'Stretched contact':null,backward>.1?'Moving backward':null,backhand&&low?'Low backhand':null,transition&&low?'Transition ball at feet':null].filter(Boolean) as string[];
 return {penalty:stretched*.18+backward*.16+(backhand&&low?.12:0)+(transition&&low?.08:0),balance:Math.max(.2,1-stretched*.5-backward*.4),labels:labels.length?labels:['Comfortable contact']};
}
