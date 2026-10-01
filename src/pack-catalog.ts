/** V1 is a fixed bundle. New paid releases need new IDs and explicit membership. */
export const PACK_IDS=['style','court','fun','everything'] as const;
export type PackId=typeof PACK_IDS[number];
export const PACKS:Record<PackId,{name:string; cents:number; productId:string; entitlement:string; stripePriceEnv:string; description:string; contentReady:boolean}>={
 style:{name:'Style Pack',cents:299,productId:'com.picklebash.app.pack.style',entitlement:'pack_style',stripePriceEnv:'STRIPE_STYLE_PRICE_ID',description:'More outfits, hairstyles, hats, accessories, and character customization.',contentReady:true},
 court:{name:'Court Pack',cents:299,productId:'com.picklebash.app.pack.court',entitlement:'pack_court',stripePriceEnv:'STRIPE_COURT_PRICE_ID',description:'Host games in five special locations. Friends can join for free.',contentReady:true},
 fun:{name:'Fun Pack',cents:299,productId:'com.picklebash.app.pack.fun',entitlement:'pack_fun',stripePriceEnv:'STRIPE_FUN_PRICE_ID',description:"Four complete themes: Disco Inferno, 80’s Night, Spooky, and Fairy Tales. Dress your players, decorate your existing courts, and add themed paddles and celebrations.",contentReady:true},
 everything:{name:'Everything Pack',cents:699,productId:'com.picklebash.app.pack.everything',entitlement:'pack_everything',stripePriceEnv:'STRIPE_EVERYTHING_PRICE_ID',description:'Style, Court, and Fun Packs in one bundle. Future paid packs sold separately.',contentReady:true},
};
export const EVERYTHING_CONTENTS:readonly PackId[]=['style','court','fun'];
export const isPackId=(id:unknown):id is PackId=>typeof id==='string'&&(PACK_IDS as readonly string[]).includes(id);
export function ownsPack(owned:readonly PackId[],pack:PackId){return owned.includes(pack)||(owned.includes('everything')&&EVERYTHING_CONTENTS.includes(pack));}
/** Purchase eligibility differs from ownership of the bundle SKU. */
export function ownsPackContent(owned:readonly PackId[],pack:PackId){return ownsPack(owned,pack)||(pack==='everything'&&EVERYTHING_CONTENTS.every(id=>ownsPack(owned,id)));}
export type CosmeticAccess=boolean|readonly PackId[];
export const hasPack=(access:CosmeticAccess,pack:PackId)=>typeof access==='boolean'?access:ownsPack(access,pack);
export const COURT_PACK_LOCATIONS=['city','glowball','jungle','winter','autumn'] as const;
/** Fail closed if a provider accidentally configures a recurring/consumable SKU. */
export function isApplePackProduct(pack:PackId,product:{identifier:string;productType:string}){return product.identifier===PACKS[pack].productId&&product.productType==='NON_CONSUMABLE';}
