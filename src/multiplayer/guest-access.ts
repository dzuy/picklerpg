export type SetupMode='friends'|'solo';
export function setupModeForAccount(isAnonymous:boolean):SetupMode{return isAnonymous?'solo':'friends'}
export function friendActionNeedsAccount(isAnonymous:boolean){return isAnonymous}
