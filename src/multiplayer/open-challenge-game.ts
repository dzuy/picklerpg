/** Mount the court in this document so storage-blocked guests keep their auth session. */
export async function openChallengeGame(matchId:string,mount:()=>Promise<unknown>,navigation:Pick<History,'replaceState'>=history){
 navigation.replaceState(null,'',`/?multiplayer=1&match=${encodeURIComponent(matchId)}`);
 await mount();
}

/** Keep the guest session alive while showing the accepted invitation in Games. */
export async function openChallengeLobby(mount:()=>Promise<unknown>,navigation:Pick<History,'replaceState'>=history,guestToken?:string){
 navigation.replaceState(null,'',guestToken?'/?openplay=1#guestChallenge='+encodeURIComponent(guestToken):'/?openplay=1');
 await mount();
}
