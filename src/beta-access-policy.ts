/** Native guest play and independently protected admin tools keep their existing access. */
export function requiresWebBetaAccount(url:URL,native:boolean){
 return !native&&!/^\/admin(?:\/(?:analytics|todos))?\/?$/.test(url.pathname);
}

export function registeredBetaUser(user:{is_anonymous?:boolean}|null|undefined){
 return !!user&&user.is_anonymous===false;
}

/** Keep invites, saved games and callback fragments on their original internal route. */
export function betaDestination(url:URL){
 const destination=new URL(url);
 destination.searchParams.delete('beta');
 return destination.pathname+destination.search+destination.hash;
}
