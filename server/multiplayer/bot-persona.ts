import {randomInt} from 'node:crypto';
import {APPEARANCE_OPTIONS,newPlayer,validatePlayer} from '../../src/player-design';
const pick=<T>(values:readonly T[]):T=>values[randomInt(values.length)];
export const BOT_PERSONAS=[['milaa27','Mila','Jun'],['rafworks','Rafa','Bea'],['teacup404','Jade','Finn'],['nico_v','Nico','Ivy'],['mooncrayon','Luna','Kai'],['th3odore','Theo','Zoe'],['poppy88','Poppy','Max'],['amirsayshi','Amir','Elle'],['slowwifi','Sage','Remy'],['ollie.exe','Ollie','Skye']].map(([handle,name,partner])=>[handle.replace('.',''),name,partner]);
export function botPlayer(name:string,id:string){
 const player=newPlayer(id),a=player.appearance;player.name=name;
 for(const [key,values] of Object.entries(APPEARANCE_OPTIONS))Object.assign(a,{[key]:pick(values)});
 a.skin=pick(['#f4d0b0','#e7b58f','#c98e65','#ad7350','#875337','#603d2b']);
 a.hair=pick(['#201e20','#52372b','#8c5636','#cfaa62','#ddd5c9','#804a73']);a.facialHairColor=a.hair;
 a.hat=pick(['none','none','none','cap','backwards','visor','headband','beanie','bucket']);
 a.glasses=pick(['none','none','none','round','square','sunglasses','sport']);
 a.facialHair=a.presentation==='girl'?'none':pick(['none','none','none','mustache','goatee','short-beard']);
 a.expression=pick(['happy','determined','serious','confident']);
 const colors=['#25364d','#e6d8bf','#a94e43','#458578','#76609c','#d6a338','#527dba','#c77898','#343539'];
 for(const key of ['jersey','bottomColor','hatColor','accent','shoes','paddle','glassesColor'] as const)a[key]=pick(colors);
 player.handedness=randomInt(8)===0?'left':'right';return validatePlayer(player);
}
export function botRecord(){const games=randomInt(70,100),wins=Math.round(games*(randomInt(25,76)/100));return {games,wins,losses:games-wins};}
export function addBotRecord(actual:{games:number;wins:number;losses:number},metadata:Record<string,unknown>){
 const baseline=metadata.bot_seed_record as typeof actual|undefined;
 if(metadata.community_bot!==true||!baseline||![baseline.games,baseline.wins,baseline.losses].every(n=>Number.isSafeInteger(n)&&n>=0)||baseline.games!==baseline.wins+baseline.losses)return actual;
 return {games:actual.games+baseline.games,wins:actual.wins+baseline.wins,losses:actual.losses+baseline.losses};
}

/** Simulated history stays separate from real matches and matches the seeded W/L totals. */
export function botActivity(record:{games:number;wins:number;losses:number},now=Date.now()){
 const outcomes=Array.from({length:record.games},(_,i)=>i<record.wins);
 for(let i=outcomes.length-1;i>0;i--){const j=randomInt(i+1);[outcomes[i],outcomes[j]]=[outcomes[j],outcomes[i]];}
 const recent=randomInt(3,10),span=randomInt(45,120),opponents=randomInt(3,10);
 return outcomes.map((won,i)=>({id:`seed-activity-${i}`,at:new Date(now-(i<recent?i:recent+Math.floor((i-recent)*span/Math.max(1,record.games-recent)))*86400000-60000).toISOString(),won,opponent:`seed-opponent-${i%opponents}`}));
}
