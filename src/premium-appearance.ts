import {hasPack,type CosmeticAccess} from './pack-catalog';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';
import {PREMIUM_APPEARANCE_OPTIONS} from './player-customization-tiers';
/** Derive a display copy; saved designs must never be rewritten when ownership changes. */
export function premiumAppearance(appearance:Appearance,entitled:CosmeticAccess):Appearance{
 const result={...appearance};if(entitled===true)return result;
 for(const [key,values] of Object.entries(PREMIUM_APPEARANCE_OPTIONS))if(!hasPack(entitled,key==='paddleShape'?'fun':'style')&&(values as readonly unknown[]).includes(appearance[key as keyof Appearance]))Object.assign(result,{[key]:DEFAULT_APPEARANCE[key as keyof Appearance]});
 return result;
}
export function changedPremiumChoices(previous:Appearance|undefined,next:Appearance,access:CosmeticAccess=false){
 return Object.entries(PREMIUM_APPEARANCE_OPTIONS).some(([key,values])=>!hasPack(access,key==='paddleShape'?'fun':'style')&&(values as readonly unknown[]).includes(next[key as keyof Appearance])&&previous?.[key as keyof Appearance]!==next[key as keyof Appearance]);
}
