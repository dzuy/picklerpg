import type {ShotIntent,ShotType} from './model';

/** Full-power speed gains. Soft shots retain their identity; attacking shots accelerate more. */
export const SHOT_POWER_RANGE:Record<ShotType,number>={serve:1.1,return:1,drive:1.2,block:.4,overhead:1.1,drop:.45,dink:.3,volley:1,reset:.4,lob:.25,counter:1.1,flick:1.05};
/** Soft contacts have a smaller placement envelope, even on a mishit. */
const SOFT_POWER_LIMITS:Partial<Record<ShotType,number>>={dink:.65,block:.85,drop:1,reset:.85};
const SPREAD_GAIN:Record<ShotType,number>={serve:3,return:2.5,drive:4.2,block:.65,overhead:3,drop:.9,dink:.5,volley:2,reset:.75,lob:4.2,counter:3,flick:2.5};
export function shotPower(intent:ShotIntent,skill=70){
 const offset=((intent.power??.5)-.5)*2;
 const effort=Math.max(0,offset),restraint=Math.max(0,-offset);
 const limit=SOFT_POWER_LIMITS[intent.type];
 const push=effort*.4+effort**3*.6;
 // Both extremes have a cost: full restraint gives opponents time, while full
 // effort sacrifices placement. Cubic curves make the ends especially demanding.
 // Keep the midpoint exact so ordinary taps retain their familiar behavior.
 return {
  speed:offset<=0?1-restraint*.2-restraint**3*.4:1+push*SHOT_POWER_RANGE[intent.type],
  spread:offset<=0?1-restraint*.6:1+(effort*.2+effort**3*.8)*SPREAD_GAIN[intent.type]*(1+.4*(1-skill/100)),
  errorLimit:limit!==undefined&&effort>0?limit/effort:Infinity,
  loft:intent.type==='lob'?1+push*2.2:1,
 };
}
