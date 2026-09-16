export interface PlayerPassword {email:string;password:string}
export interface PlayerSession {access_token:string;refresh_token:string;user:{id:string}}
export interface RegistrationAuth {
 signIn(credentials:PlayerPassword):Promise<PlayerSession>;
 install(session:PlayerSession):Promise<void>;
}
/** Password assignment revokes guest refresh tokens; acquire a new session instead.
 * Keep successful registration across retries, and verify identity before installing it.
 * Credentials are held only for this open form, never written to browser storage.
 */
export function guestRegistration(owner:string,register:(credentials:PlayerPassword)=>Promise<unknown>,auth:RegistrationAuth){
 let saved:PlayerPassword|null=null;
 return async(credentials:PlayerPassword)=>{
  if(!saved){await register(credentials);saved={...credentials};}
  let session:PlayerSession;
  try{session=await auth.signIn(saved);}catch{throw Error('Your player was saved. Tap Save your progress again to reconnect to your game.');}
  if(session.user.id!==owner)throw Error('This sign-in belongs to a different player. Your original match has not changed.');
  try{await auth.install(session);}catch{throw Error('Your player was saved. Tap Save your progress again to reconnect to your game.');}
 };
}
