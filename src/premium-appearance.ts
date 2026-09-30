import {hasPack,type CosmeticAccess,type PackId} from './pack-catalog';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';
import {PREMIUM_APPEARANCE_OPTIONS} from './player-customization-tiers';
/** Derive a display copy; saved designs must never be rewritten when ownership changes. */
export function premiumAppearance(appearance:Appearance,entitled:CosmeticAccess):Appearance{
 const result={...appearance};if(entitled===true)return result;
 if(!hasPack(entitled,'fun')){delete result.funTheme;delete result.funVariant;delete result.funPaddle;delete result.funOverrides;}
 for(const [key,values] of Object.entries(PREMIUM_APPEARANCE_OPTIONS))if(!hasPack(entitled,key==='paddleShape'?'fun':'style')&&(values as readonly unknown[]).includes(appearance[key as keyof Appearance]))Object.assign(result,{[key]:DEFAULT_APPEARANCE[key as keyof Appearance]});
 return result;
}
/** Missing packs for new choices only; retain previously saved designs after revocation. */
export function missingAppearancePacks(previous:Appearance|undefined,next:Appearance,access:CosmeticAccess=false):PackId[]{
 const missing=new Set<PackId>();
 for(const [key,values] of Object.entries(PREMIUM_APPEARANCE_OPTIONS)){
  const pack=key==='paddleShape'?'fun':'style';
  if(!hasPack(access,pack)&&(values as readonly unknown[]).includes(next[key as keyof Appearance])&&previous?.[key as keyof Appearance]!==next[key as keyof Appearance])missing.add(pack);
 }
 if(!hasPack(access,'fun')&&(
  (next.funTheme&&next.funTheme!=='none'&&next.funVariant!==previous?.funVariant)||
  (['funTheme','funPaddle'] as const).some(k=>next[k]&&next[k]!=='none'&&next[k]!==previous?.[k])
 ))missing.add('fun');
 return [...missing];
}
export function changedPremiumChoices(previous:Appearance|undefined,next:Appearance,access:CosmeticAccess=false){
 return missingAppearancePacks(previous,next,access).length>0;
}
