import {authClient} from './auth-session';
import {browserStorage,browserSessionStorage} from './browser-storage';
import {addPlayerToSignedInAccount,PENDING_ACCOUNT_PLAYER_KEY} from './cloud-players';
import {parseLibrary,PLAYER_STORAGE_KEY,type DesignedPlayer} from './player-design';

/** Keep an explicitly edited guest player across account changes and reloads. */
export async function stageGuestAccountPlayer(){
 if(browserSessionStorage.getItem(PENDING_ACCOUNT_PLAYER_KEY))return;
 const session=(await authClient()?.auth.getSession())?.data.session;
 if(session&&!session.user.is_anonymous)return;
 const library=parseLibrary(browserStorage.getItem(PLAYER_STORAGE_KEY));
 const player=library.players.find(p=>p.id===library.activeId);
 if(player&&!player.id.startsWith('community-'))browserSessionStorage.setItem(PENDING_ACCOUNT_PLAYER_KEY,JSON.stringify(player));
}
export function prepareAccountPlayerTransfer(){
 if(!browserSessionStorage.getItem(PENDING_ACCOUNT_PLAYER_KEY))return;
 const destination=new URL('/?openplay=1&importplayer=1',location.origin);
 history.replaceState(null,'',destination);
}
/** Delete the pending copy only after a confirmed save; failures remain retryable. */
export async function transferPendingAccountPlayer(storage:Pick<Storage,'getItem'|'removeItem'>=browserSessionStorage,save:(player:DesignedPlayer)=>Promise<void>=addPlayerToSignedInAccount){
 const pending=storage.getItem(PENDING_ACCOUNT_PLAYER_KEY);if(!pending)return false;
 await save(JSON.parse(pending));
 if(storage.getItem(PENDING_ACCOUNT_PLAYER_KEY)===pending)storage.removeItem(PENDING_ACCOUNT_PLAYER_KEY);
 return true;
}
