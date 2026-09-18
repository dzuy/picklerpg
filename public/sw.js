/* No fetch handler: all game state and assets continue to use the network. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
const matchUrl = id => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || '')
  ? new URL('/?multiplayer=1&match=' + encodeURIComponent(id), self.location.origin).href
  : new URL('/?multiplayer=1', self.location.origin).href;
self.addEventListener('push', event => {
 event.waitUntil((async () => {
  let data; try { data = event.data.json() || {}; } catch { data = {}; }
  // Safari requires a visible notification for every push. Activity is suppressed
  // before delivery by a short server-side lease, never by silently dropping push.
  const name = typeof data.opponentName === 'string' ? data.opponentName.slice(0,32) : 'Your opponent';
  await self.registration.showNotification('PickleBash', {
   body: data.type === 'nudge' ? `${name} nudged you. Your turn.` : `${name} played. Your turn.`, icon:'/icons/icon-192.png?v=2',
   tag:`turn-${data.matchId || 'ready'}`, data:{url:matchUrl(data.matchId)}
  });
 })());
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async () => {
  let target;
  try { const url = new URL(event.notification.data.url); target = url.origin === self.location.origin ? matchUrl(url.searchParams.get('match')) : matchUrl(null); }
  catch { target = matchUrl(null); }
  const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const candidates = windows.filter(client => new URL(client.url).origin === self.location.origin);
  const existing = candidates.find(client => client.url === target) || candidates.find(client => new URL(client.url).searchParams.get('multiplayer') === '1') || candidates[0];
  if (existing) {
   try { await existing.focus(); if(existing.url !== target) { const navigated = await existing.navigate(target); if(!navigated) throw Error('Window closed'); } return; } catch {}
  }
  await self.clients.openWindow(target);
 })());
});
