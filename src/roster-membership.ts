import {normalizeSkillBudget} from './skill-budget';
import {authClient} from './auth-session';
import {LOOKS} from './player-looks';
import {newPlayer,type DesignedPlayer} from './player-design';
import {browserStorage} from './browser-storage';
export const startingPlayers:DesignedPlayer[]=LOOKS.map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:normalizeSkillBudget(look.skills,35)}));
const defaults=['preset-0','preset-1'];
let owner='local',ids=[...defaults],removedOwned:string[]=[];
const ownedKey=()=>`pickle-roster-owned-excluded-v1:${owner}`;
export const ownedRosterPlayers=(players:DesignedPlayer[])=>players.filter(p=>!removedOwned.includes(p.id));
const key=()=>`pickle-roster-starters-v1:${owner}`;
const clean=(value:unknown)=>Array.isArray(value)?startingPlayers.filter(p=>value.includes(p.id)).map(p=>p.id):[...defaults];
export const rosterStarters=()=>startingPlayers.filter(p=>ids.includes(p.id));
export async function loadRosterStarters(){
 const client=authClient(),session=client?(await client.auth.getSession()).data.session:null;owner=session?.user.id??'local';
 const remote=session?.user.user_metadata?.roster_starters;
 let excluded:unknown=session?.user.user_metadata?.roster_owned_excluded;
 if(excluded==null)try{excluded=JSON.parse(browserStorage.getItem(ownedKey())??'[]')}catch{}
 removedOwned=Array.isArray(excluded)?excluded.filter((id):id is string=>typeof id==='string'):[];
 browserStorage.setItem(ownedKey(),JSON.stringify(removedOwned));
 let cached:unknown=null;try{cached=JSON.parse(browserStorage.getItem(key())??'null')}catch{}
 ids=clean(remote??cached);
 browserStorage.setItem(key(),JSON.stringify(ids));return rosterStarters();
}
export async function setStarterAdded(id:string,added:boolean){
 const next=added?[...new Set([...ids,id])]:ids.filter(p=>p!==id),client=authClient();
 if(owner!=='local'&&client){const {error}=await client.auth.updateUser({data:{roster_starters:next}});if(error)throw Error('Could not save your roster. Please try again.');}
 ids=next;browserStorage.setItem(key(),JSON.stringify(ids));
}

/** Removing an owned design changes selection eligibility, never its saved data. */
export async function setOwnedPlayerAdded(id:string,added:boolean){
 const next=added?removedOwned.filter(value=>value!==id):[...new Set([...removedOwned,id])];
 const client=authClient();
 if(owner!=='local'&&client){const {error}=await client.auth.updateUser({data:{roster_owned_excluded:next}});if(error)throw Error('Could not save your roster. Please try again.');}
 removedOwned=next;browserStorage.setItem(ownedKey(),JSON.stringify(removedOwned));
}
