export function normalizeTeamName(value:string){
 const name=value.trim().replace(/\s+/g,' ');
 if(name.length>48)throw new Error('Use 48 characters or fewer for your team name.');
 return name;
}
export function teamDisplayName(playerName?:string,customName?:string){
 return customName?.trim()||`Team ${playerName?.trim()||'You'}`;
}
