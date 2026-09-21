/** Mount the court in this document so storage-blocked guests keep their auth session. */
export async function openChallengeGame(matchId:string,mount:()=>Promise<unknown>,navigation:Pick<History,'replaceState'>=history){
 navigation.replaceState(null,'',`/?multiplayer=1&match=${encodeURIComponent(matchId)}`);
 await mount();
}
