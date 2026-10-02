export interface AdminAccount {
 id:string;username:string;email:string;playerName:string;createdAt:string;updatedAt:string;
 lastSignInAt:string|null;guest:boolean;emailConfirmed:boolean;bot:boolean;bannedUntil:string|null;
 deletionRequestedAt:string|null;archivedAt:string|null;owner:boolean;
}
export interface AdminUserPage {users:AdminAccount[];page:number;total:number;nextPage:number|null}
export interface AdminUserDetail {user:AdminAccount;players:number;activeGames:number;completedGames:number}
