import {authClient} from './auth-session';
import {LOOKS} from './player-looks';
import {newPlayer,type DesignedPlayer} from './player-design';
export const startingPlayers:DesignedPlayer[]=LOOKS.map((look,i)=>({...newPlayer(`preset-${i}`),name:look.name,appearance:{...look.appearance},skills:{...look.skills}}));
const defaults=['preset-0','preset-1'];
let owner='local',ids=[...defaults];
const key=()=>`pickle-roster-starters-v1:${owner}`;
const clean=(value:unknown)=>Array.isArray(value)?startingPlayers.filter(p=>value.includes(p.id)).map(p=>p.id):[...defaults];
export const rosterStarters=()=>startingPlayers.filter(p=>ids.includes(p.id));
export async function loadRosterStarters(){
 const client=authClient(),session=client?(await client.auth.getSession()).data.session:null;owner=session?.user.id??'local';
 const remote=session?.user.user_metadata?.roster_starters;
 let cached:unknown=null;try{cached=JSON.parse(localStorage.getItem(key())??'null')}catch{}
 ids=clean(remote??cached);
 localStorage.setItem(key(),JSON.stringify(ids));return rosterStarters();
}
export async function setStarterAdded(id:string,added:boolean){
 const next=added?[...new Set([...ids,id])]:ids.filter(p=>p!==id),client=authClient();
 if(owner!=='local'&&client){const {error}=await client.auth.updateUser({data:{roster_starters:next}});if(error)throw Error('Could not save your roster. Please try again.');}
 ids=next;localStorage.setItem(key(),JSON.stringify(ids));
}
