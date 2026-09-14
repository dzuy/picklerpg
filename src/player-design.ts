import {SKILLS,type PlayerSkills} from './engine/model';
import {PLAYER_PROFILES} from './engine/player-profiles';
export const APPEARANCE_OPTIONS={presentation:['girl','boy'],expression:['happy','determined','angry','crying','serious','confident'],paddleShape:['rectangular','circular','squarish','squarish-stripes','squarish-circles','squarish-lines','rounded','rounded-stripes','rounded-circles','rounded-lines'],face:['oval','round','angular'],hairStyle:['ponytail','short','bun','side-part','bob','curls','spiky','mohawk','long','none'],facialHair:['none','mustache','goatee','short-beard','long-beard','chops'],hat:['none','cap','backwards','visor','headband','beanie','bucket','crown'],glasses:['none','square','round','sunglasses','sport','oval','cat-eye','hexagon'],shoeStyle:['court','runner','high-top','slip-on'],top:['tank','jersey','polo','hoodie','long-sleeve'],bottom:['shorts','skirt','skort','pleated-skirt','long-shorts','pants'],accessory:['none','wristband','watch']} as const;
export interface Appearance {
 facialHair:typeof APPEARANCE_OPTIONS.facialHair[number];facialHairColor:string;
 presentation:typeof APPEARANCE_OPTIONS.presentation[number];
 face:typeof APPEARANCE_OPTIONS.face[number];hairStyle:typeof APPEARANCE_OPTIONS.hairStyle[number];hat:typeof APPEARANCE_OPTIONS.hat[number];glasses:typeof APPEARANCE_OPTIONS.glasses[number];
 top:typeof APPEARANCE_OPTIONS.top[number];bottom:typeof APPEARANCE_OPTIONS.bottom[number];accessory:typeof APPEARANCE_OPTIONS.accessory[number];
 expression:typeof APPEARANCE_OPTIONS.expression[number];paddleShape:typeof APPEARANCE_OPTIONS.paddleShape[number];
 shoeStyle:typeof APPEARANCE_OPTIONS.shoeStyle[number];glassesColor:string;lensColor:string;
 skin:string;hair:string;jersey:string;bottomColor:string;hatColor:string;accent:string;shoes:string;paddle:string;
}
export interface DesignedPlayer {id:string;name:string;catchphrase?:string;isPublic?:boolean;appearance:Appearance;skills:PlayerSkills;handedness:'left'|'right'}
export interface PlayerLibrary {version:1;activeId:string|null;players:DesignedPlayer[]}
export const PLAYER_STORAGE_KEY='pickle-rpg-players-v1';
export const DEFAULT_APPEARANCE:Appearance={facialHair:'none',facialHairColor:'#493629',expression:'happy',paddleShape:'squarish',presentation:'boy',face:'oval',hairStyle:'short',hat:'cap',glasses:'none',glassesColor:'#25272d',lensColor:'#b7dce5',shoeStyle:'court',skin:'#dba67f',hair:'#493629',jersey:'#f3dc86',accent:'#214d43',hatColor:'#214d43',bottomColor:'#214d43',top:'jersey',bottom:'shorts',accessory:'wristband',shoes:'#214d43',paddle:'#214d43'};
export function playerId(source:Pick<Crypto,'getRandomValues'> & Partial<Pick<Crypto,'randomUUID'>>=globalThis.crypto):string{
 if(typeof source.randomUUID==='function')return source.randomUUID();
 // LAN HTTP lacks randomUUID, but still supports getRandomValues.
 const bytes=source.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function newPlayer(id:string=playerId()):DesignedPlayer{return {id,name:'New player',appearance:{...DEFAULT_APPEARANCE},skills:{...PLAYER_PROFILES.you.skills},handedness:'right'}}
export function validatePlayer(value:unknown):DesignedPlayer{return validatePlayerRecord(value,30)}
function validatePlayerRecord(value:unknown,catchphraseLimit:number):DesignedPlayer{
 if(!value||typeof value!=='object')throw new Error('Invalid player record.');
 const p=value as DesignedPlayer;
 if(typeof p.id!=='string'||!p.id||p.id.length>100)throw new Error('Invalid player ID.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>24)throw new Error('Use a player name of 1–24 characters.');
 if(p.catchphrase!==undefined&&(typeof p.catchphrase!=='string'||p.catchphrase.trim().length>catchphraseLimit))throw new Error(`Use a catchphrase of up to ${catchphraseLimit} characters.`);
 if(p.isPublic!==undefined&&typeof p.isPublic!=='boolean')throw new Error('Choose a valid sharing setting.');
 if(p.handedness!=='left'&&p.handedness!=='right')throw new Error('Choose a playing hand.');
 if(!p.appearance||!p.skills)throw new Error('Player appearance or skills are missing.');
 // Older saved players gain new outfit options without losing their design.
 const appearance={...p.appearance,facialHair:p.appearance.facialHair??'none',facialHairColor:p.appearance.facialHairColor??p.appearance.hair,expression:p.appearance.expression??'happy',paddleShape:p.appearance.paddleShape??'rectangular',shoeStyle:p.appearance.shoeStyle??'court',glassesColor:p.appearance.glassesColor??'#25272d',lensColor:p.appearance.lensColor??(p.appearance.glasses==='sport'?'#234650':p.appearance.glasses==='sunglasses'?'#242630':'#b7dce5'),presentation:p.appearance.presentation??'boy',bottomColor:p.appearance.bottomColor??p.appearance.accent,hatColor:p.appearance.hatColor??(p.appearance.hat==='visor'?p.appearance.jersey:p.appearance.accent),top:p.appearance.top??'jersey',bottom:p.appearance.bottom==='skort'?'skirt':p.appearance.bottom??'shorts',accessory:p.appearance.accessory??'wristband',shoes:p.appearance.shoes??p.appearance.accent,paddle:p.appearance.paddle??p.appearance.accent};
 for(const [key,options] of Object.entries(APPEARANCE_OPTIONS))if(!(options as readonly string[]).includes(appearance[key as keyof Appearance]))throw new Error('Unknown appearance option.');
 for(const key of ['facialHairColor','lensColor','glassesColor','skin','hair','jersey','bottomColor','hatColor','accent','shoes','paddle'] as const)if(!/^#[0-9a-f]{6}$/i.test(appearance[key]))throw new Error('Choose a valid color.');
 for(const key of SKILLS)if(!Number.isInteger(p.skills[key])||p.skills[key]<0||p.skills[key]>100)throw new Error('Skills must be whole numbers from 0 to 100.');
 return {id:p.id,name:p.name.trim(),...(p.isPublic!==undefined?{isPublic:p.isPublic}:{}),...(p.catchphrase?.trim()?{catchphrase:p.catchphrase.trim()}:{}),handedness:p.handedness,appearance:{facialHair:appearance.facialHair,facialHairColor:appearance.facialHairColor,expression:appearance.expression,paddleShape:appearance.paddleShape,shoeStyle:appearance.shoeStyle,glassesColor:appearance.glassesColor,lensColor:appearance.lensColor,presentation:appearance.presentation,face:p.appearance.face,hairStyle:p.appearance.hairStyle,hat:p.appearance.hat,glasses:p.appearance.glasses,skin:p.appearance.skin,hair:p.appearance.hair,jersey:p.appearance.jersey,accent:p.appearance.accent,bottomColor:appearance.bottomColor,hatColor:appearance.hatColor,top:appearance.top,bottom:appearance.bottom,accessory:appearance.accessory,shoes:appearance.shoes,paddle:appearance.paddle},skills:Object.fromEntries(SKILLS.map(key=>[key,p.skills[key]])) as PlayerSkills};
}
export function parseLibrary(raw:string|null):PlayerLibrary{
 if(raw===null)return {version:1,activeId:null,players:[]};
 const value=JSON.parse(raw);
 if(value?.version!==1||!Array.isArray(value.players)||value.players.length>100)throw new Error('Saved players could not be read.');
 const players:DesignedPlayer[]=value.players.map((player:unknown)=>validatePlayerRecord(player,60));
 if(new Set(players.map(p=>p.id)).size!==players.length)throw new Error('Saved players have duplicate IDs.');
 if(value.activeId!==null&&!players.some(p=>p.id===value.activeId))throw new Error('The selected player is missing.');
 return {version:1,activeId:value.activeId,players};
}
export function savePlayer(storage:Pick<Storage,'setItem'>,library:PlayerLibrary,draft:DesignedPlayer,activate=false):PlayerLibrary{
 if(draft.id.startsWith('community-'))throw new Error('Community Players can only be edited by their creator.');
 const player=validatePlayer(draft),players=library.players.filter(p=>p.id!==player.id);
 if(players.length>=100)throw new Error('This roster is full (100 players).');
 const next:PlayerLibrary={version:1,activeId:activate?player.id:library.activeId,players:[...players,player]};
 // Commit to memory only after storage succeeds, so quota errors cannot lose data.
 storage.setItem(PLAYER_STORAGE_KEY,JSON.stringify(next));return structuredClone(next);
}

/** Persist first so a storage failure leaves the caller's roster intact. */
export function deletePlayer(storage:Pick<Storage,'setItem'>,library:PlayerLibrary,id:string):PlayerLibrary{
 const next:PlayerLibrary={version:1,activeId:library.activeId===id?null:library.activeId,players:library.players.filter(player=>player.id!==id)};
 storage.setItem(PLAYER_STORAGE_KEY,JSON.stringify(next));return structuredClone(next);
}
