/** Focus can move into the court iframe while the app remains visible. */
export function pushActivityState(visibility:DocumentVisibilityState,leaving:boolean,embedded:boolean):boolean|null{
 // Closing a child game must not clear its still-visible launcher's lease.
 if(leaving&&embedded)return null;
 return !leaving&&visibility==='visible';
}
