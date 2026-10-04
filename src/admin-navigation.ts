import type {User} from '@supabase/supabase-js';
import './admin-navigation.css';

export function adminNavigation(active:'community'|'analytics'|'todos'){
 return `<aside class="admin-sidebar"><a class="admin-sidebar-brand" href="/play?openplay=1"><img src="/images/start/picklebash-logo.png" alt="PickleBash" width="300" height="140"><span>ADMIN</span></a><nav aria-label="Admin navigation"><a href="/admin" ${active==='community'?'aria-current="page"':''}>Community</a><a href="/admin/analytics" ${active==='analytics'?'aria-current="page"':''}>Game Analytics</a><a href="/admin/todos" ${active==='todos'?'aria-current="page"':''}>To-do List</a></nav><div class="admin-sidebar-account"><p id="admin-identity">Not signed in</p><button id="admin-signout" type="button" hidden>Sign out</button></div></aside>`;
}
export function setAdminIdentity(root:HTMLElement,user:User|null){
 const identity=root.querySelector<HTMLElement>('#admin-identity')!,signout=root.querySelector<HTMLButtonElement>('#admin-signout')!;
 identity.replaceChildren();
 if(user&&!user.is_anonymous){
  const label=document.createElement('span');label.textContent='Signed in as';
  const name=document.createElement('strong');name.textContent=typeof user.user_metadata?.username==='string'&&user.user_metadata.username?'@'+user.user_metadata.username:user.email||'Admin account';
  identity.append(label,name);signout.hidden=false;
 }else{identity.textContent='Not signed in';signout.hidden=true;}
}
