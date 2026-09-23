import {authClient} from './auth-session';
import {createYourPlayer} from './multiplayer/friend-flow';

/** A guest's add attempt opens onboarding without changing roster membership. */
export async function canAddToRoster():Promise<boolean>{
 const session=(await authClient()?.auth.getSession())?.data.session;
 if(session&&!session.user.is_anonymous)return true;
 const refresh=async()=>{location.reload()};
 await createYourPlayer(async()=>{location.assign('/?openplay=1&setup=1');},{onSignIn:refresh});
 return false;
}
