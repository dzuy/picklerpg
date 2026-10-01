import {authClient} from './auth-session';

let checking:Promise<boolean>|null=null;
/** Guests stay on their current screen while the shared account dialog is open. */
export function profileAccess():Promise<boolean>{
 if(checking)return checking;
 checking=(async()=>{
  const session=(await authClient()?.auth.getSession())?.data.session;
  if(session&&!session.user.is_anonymous)return true;
  if(!document.querySelector('.friend-account-dialog,#profile-sign-in')){
   const {createYourPlayer}=await import('./multiplayer/friend-flow');
   const complete=async()=>{location.assign('/?openplay=1&tab=profile');};
   void createYourPlayer(async()=>{},{onSignIn:complete});
  }
  return false;
 })().finally(()=>{checking=null;});
 return checking;
}
