import type {ShotIntent} from './model';
/** A compact topspin attack, using the existing drive / airborne flick mechanics. */
export function isSpeedUp(intent:ShotIntent){
 return (intent.type==='drive'||intent.type==='flick')&&intent.pace==='fast'&&intent.spin?.vertical==='topspin'&&intent.spin.strength==='medium'&&intent.aggression===.72&&intent.intendedNetClearance===.2;
}
