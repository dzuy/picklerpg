export interface ChallengeUser {id:string;is_anonymous?:boolean;user_metadata?:{player_name?:unknown}}
/** Only ask when an existing named identity differs from the invitation. */
export function challengeIdentity(user:ChallengeUser,invitedName:string){
 const saved=typeof user.user_metadata?.player_name==='string'?user.user_metadata.player_name.trim().replace(/\s+/g,' '):'';
 const name=saved||invitedName;
 return {name,needsChoice:!!saved&&saved.toLocaleLowerCase()!==invitedName.trim().replace(/\s+/g,' ').toLocaleLowerCase(),canSwitch:!user.is_anonymous};
}
