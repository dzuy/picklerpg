/** Only an internal tester match UUID can survive the trip through account settings. */
export function accountReturnUrl(url:URL){
 const match=url.searchParams.get('returnMatch');
 return match&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match)
  ?`${url.origin}/?multiplayer=1&match=${match}`:`${url.origin}${url.pathname}`;
}
