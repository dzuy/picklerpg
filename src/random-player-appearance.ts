import {APPEARANCE_OPTIONS,DEFAULT_APPEARANCE,type Appearance} from './player-design';
import {PREMIUM_APPEARANCE_OPTIONS} from './player-customization-tiers';
import {hasPack,type CosmeticAccess} from './pack-catalog';
const hairColors=['#754732','#252429','#efc568','#b85b34','#814cac','#b8babc'];
const skinColors=['#f0cbae','#e7af8c','#c8926e','#ad7553','#875338','#543c32'];
const colors=['#fa6796','#4285df','#efbf43','#e85860','#ac7bd8','#36936c','#424247','#fff7ef','#203e6a','#ed8d3c','#80cdd2','#754732','#a6c64c'];
const lensColors=['#b7dce5','#242630','#234650','#754732','#efbf43','#ac7bd8','#f56794','#4285df'];
/** Choose only parts owned by the wearer, including free choices. */
export function randomPlayerAppearance(access:CosmeticAccess=false,random:()=>number=Math.random):Appearance{
 const pick=<T,>(items:readonly T[]):T=>items[Math.floor(random()*items.length)];
 const appearance={...DEFAULT_APPEARANCE};
 for(const key of Object.keys(APPEARANCE_OPTIONS) as Array<keyof typeof APPEARANCE_OPTIONS>){
  const premium:readonly string[]=hasPack(access,key==='paddleShape'?'fun':'style')?[]:PREMIUM_APPEARANCE_OPTIONS[key]??[];
  Object.assign(appearance,{[key]:pick(APPEARANCE_OPTIONS[key].filter(value=>!premium.includes(value)))});
 }
 appearance.skin=pick(skinColors);appearance.hair=pick(hairColors);appearance.facialHairColor=pick(hairColors);
 for(const key of ['jersey','bottomColor','hatColor','accent','shoes','paddle','glassesColor','outfitColor'] as const)appearance[key]=pick(colors);
 appearance.lensColor=pick(lensColors);appearance.lensTranslucency=Math.floor(random()*101);
 return appearance;
}
