import {authClient} from './auth-session';
import {adminNavigation,setAdminIdentity} from './admin-navigation';
import {signInDialog} from './multiplayer/sign-in-dialog';
import type {AdminAccount,AdminUserPage,AdminUserDetail} from './admin-users-contract';
import './admin-users.css';

document.title='Admin · PickleBash';
document.body.classList.add('admin-users-page');
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<div class="admin-layout">${adminNavigation('community')}<main class="admin-shell"><header><div><h1>Your community</h1><p>Manage accounts and keep the game welcoming.</p></div><button id="admin-refresh">Refresh</button></header><p id="admin-notice" role="status" aria-live="polite"></p><section id="admin-content"></section><footer>Private account information · Only dzuy has access.</footer></main></div>`;
const content=root.querySelector<HTMLElement>('#admin-content')!,notice=root.querySelector<HTMLElement>('#admin-notice')!,signout=root.querySelector<HTMLButtonElement>('#admin-signout')!,refresh=root.querySelector<HTMLButtonElement>('#admin-refresh')!;
let generation=0,page=1,scope:'active'|'archived'|'all'='active',loaded:AdminUserPage|null=null;
class RequestError extends Error {constructor(public status:number,message:string){super(message)}}
const date=(value:string|null)=>value?new Date(value).toLocaleString(): 'Never';
function el<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
function button(label:string,action:()=>void){const node=el('button',label);node.type='button';node.onclick=action;return node;}
function closePrivateDialogs(){document.querySelectorAll<HTMLDialogElement>('.admin-dialog').forEach(d=>{d.close();d.remove();});}
function clear(){generation++;loaded=null;content.replaceChildren();closePrivateDialogs();}
async function request<T>(path:string,input?:unknown):Promise<T>{
 const stamp=generation,client=authClient(),session=client?(await client.auth.getSession()).data.session:null;
 if(stamp===generation)setAdminIdentity(root,session?.user??null);
 if(!session||session.user.is_anonymous)throw new RequestError(401,'Sign in with your dzuy account.');
 const response=await fetch(path,{method:input?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,cache:'no-store'});
 const data=await response.json();if(stamp!==generation)throw new RequestError(0,'Session changed.');
 if(!response.ok)throw new RequestError(response.status,data.error?.message??'Could not update accounts.');
 return data as T;
}
function locked(message:string){clear();notice.textContent='Private dashboard';const panel=el('div');panel.className='admin-empty';panel.append(el('h2','Sign in to manage accounts'),el('p',message),button('Sign in as dzuy',()=>signInDialog(load)));content.append(panel);}
function handleError(error:unknown,target:HTMLElement=notice){
 if(error instanceof RequestError&&error.status===0)return;
 if(error instanceof RequestError&&[401,403].includes(error.status)){locked(error.message);return;}
 target.textContent=error instanceof Error?error.message:'Could not load accounts. Try Refresh.';
}
function badges(user:AdminAccount){
 const list=[user.owner?'Owner':user.bot?'Community bot':user.guest?'Guest':'Registered',user.guest?'':user.emailConfirmed?'Email verified':'Email unverified',user.archivedAt?'Archived':'',user.deletionRequestedAt?'Deletion requested':'',user.bannedUntil&&Date.parse(user.bannedUntil)>Date.now()?'Sign-in banned':''].filter(Boolean);
 const wrap=el('div');wrap.className='admin-badges';for(const label of list){const badge=el('span',label);if(label==='Deletion requested'||label==='Sign-in banned')badge.className='attention';wrap.append(badge);}return wrap;
}
export function render(data:AdminUserPage){
 content.replaceChildren();
 const toolbar=el('div');toolbar.className='admin-toolbar';
 const search=el('input');search.type='search';search.placeholder='Search this page by username, name, email or ID';search.setAttribute('aria-label','Search accounts on this page');
 const filter=el('select');filter.setAttribute('aria-label','Filter accounts on this page');for(const [value,label] of [['all','All accounts'],['registered','Registered'],['guest','Guests'],['bot','Community bots'],['deletion','Deletion requested']]){const option=el('option',label);option.value=value;filter.append(option);}
 const scopeFilter=el('select');scopeFilter.setAttribute('aria-label','Account archive view');for(const [value,label] of [['active','Active accounts'],['archived','Archived accounts'],['all','All accounts including archived']]){const option=el('option',label);option.value=value;scopeFilter.append(option);}scopeFilter.value=scope;scopeFilter.onchange=()=>{scope=scopeFilter.value as typeof scope;page=1;void load();};
 toolbar.append(el('strong',`${data.total} accounts`),scopeFilter,search,filter);
 const wrapper=el('div');wrapper.className='admin-table-wrap';const table=el('table');table.innerHTML='<thead><tr><th scope="col">Account</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Last sign-in</th><th scope="col">Manage</th></tr></thead>';const body=el('tbody');table.append(body);wrapper.append(table);
 const empty=el('p');empty.className='admin-no-results';
 const draw=()=>{body.replaceChildren();const query=search.value.toLowerCase().trim();const users=data.users.filter(u=>[u.username,u.playerName,u.email,u.id].join(' ').toLowerCase().includes(query)&&(filter.value==='all'||(filter.value==='registered'&&!u.guest&&!u.bot)||(filter.value==='guest'&&u.guest)||(filter.value==='bot'&&u.bot)||(filter.value==='deletion'&&!!u.deletionRequestedAt)));
  for(const user of users){const row=el('tr'),identity=el('td');identity.append(el('strong',user.username?'@'+user.username:user.playerName||'Guest account'),el('small',user.email||user.id));const state=el('td');state.append(badges(user));const action=el('td');action.append(button(user.owner?'View':'Manage',()=>void openAccount(user.id)));row.append(identity,state,el('td',date(user.createdAt)),el('td',date(user.lastSignInAt)),action);body.append(row);}empty.textContent=users.length?'':'No matching accounts on this page.';
 };search.oninput=draw;filter.onchange=draw;draw();
 const pager=el('div');pager.className='admin-pagination';const previous=button('Previous',()=>{page--;void load();});previous.disabled=data.page<=1;const next=button('Next',()=>{page=data.nextPage!;void load();});next.disabled=data.nextPage===null;pager.append(previous,el('span',`Page ${data.page} · Up to 50 accounts per page`),next);
 content.append(toolbar,wrapper,empty,pager,el('p','Last sign-in is an account login timestamp, not live online presence. Game counts are retained multiplayer records.'));
}
async function load(){
 clear();const stamp=generation;refresh.disabled=true;notice.textContent='Checking admin access…';
 try{const data=await request<AdminUserPage>(`/api/admin/users?page=${page}&scope=${scope}`);if(stamp!==generation)return;loaded=data;render(data);notice.textContent='Account list updated.';}
 catch(error){if(stamp===generation)handleError(error);}
 finally{if(stamp===generation)refresh.disabled=false;else if(!loaded)refresh.disabled=false;}
}
function dialog(title:string){closePrivateDialogs();const d=el('dialog');d.className='admin-dialog';const heading=el('h2',title);heading.id='admin-dialog-heading';d.setAttribute('aria-labelledby',heading.id);d.append(button('Close',()=>d.close()),heading);d.addEventListener('close',()=>d.remove());document.body.append(d);return d;}
async function openAccount(id:string){
 const stamp=generation;notice.textContent='Loading account…';
 try{const detail=await request<AdminUserDetail>(`/api/admin/users/${id}`);if(stamp!==generation)return;notice.textContent='';showAccount(detail);}catch(error){if(stamp===generation)handleError(error);}
}
export function showAccount(detail:AdminUserDetail){
 const user=detail.user,d=dialog(user.username?'@'+user.username:'Account details');d.append(badges(user));
 const facts=el('dl');for(const [label,value] of [['Account ID',user.id],['Created',date(user.createdAt)],['Last sign-in',date(user.lastSignInAt)],['Archived',user.archivedAt?date(user.archivedAt):'No'],['Deletion requested',user.deletionRequestedAt?date(user.deletionRequestedAt):'No'],['Saved players',String(detail.players)],['Active multiplayer games',String(detail.activeGames)],['Completed multiplayer games',String(detail.completedGames)]]){facts.append(el('dt',label),el('dd',value));}d.append(facts);
 const form=el('form');const fields:Record<string,HTMLInputElement>={};
 for(const [key,label,value,type] of [['username','Username',user.username,'text'],['playerName','Display name',user.playerName,'text'],['email','Email',user.email,'email']]){const wrap=el('label',label),input=el('input');input.name=key;input.type=type;input.value=value;input.disabled=user.owner||!!user.archivedAt||(key==='email'&&user.guest);if(key==='username'){input.pattern='[a-z0-9_]{3,24}';input.maxLength=24;input.required=!!user.username;input.autocapitalize='none';}if(key==='playerName')input.maxLength=24;if(key==='email'){input.maxLength=254;input.required=!user.guest;}fields[key]=input;wrap.append(input);form.append(wrap);}
 const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const save=el('button','Save changes');save.type='submit';save.disabled=user.owner||!!user.archivedAt;form.append(el('p','Email changes affect sign-in. This form does not mark an unverified email as verified.'),save,status);
 form.onsubmit=event=>{event.preventDefault();if(save.disabled)return;save.disabled=true;status.textContent='Saving…';void request(`/api/admin/users/${user.id}`,{action:'edit',username:fields.username.value.trim().toLowerCase(),playerName:fields.playerName.value.trim(),email:fields.email.value.trim(),updatedAt:user.updatedAt}).then(async()=>{d.close();await load();notice.textContent='Account saved.';}).catch(error=>{handleError(error,status);save.disabled=false;});};
 d.append(form);if(!user.owner&&!user.archivedAt){const remove=button('Remove account',()=>showRemoval(user));remove.className='admin-danger';d.append(remove);}else d.append(el('p',user.archivedAt?'This account is archived. Sign-in and game access are disabled; its data is retained.':'Your owner account is protected from edits and removal here.'));d.showModal();
}
function showRemoval(user:AdminAccount){
 const d=dialog('Archive this account?');
 d.append(el('p',`Archive ${user.username?'@'+user.username:user.email||'this guest'}? They will lose access to their account and disappear from player discovery.`),el('p','Their account, saved players, game history and purchases will be retained. No data is permanently deleted.'));
 const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const archive=button('Archive account',()=>{if(archive.disabled)return;archive.disabled=true;status.textContent='Archiving account…';void request(`/api/admin/users/${user.id}`,{action:'remove',updatedAt:user.updatedAt}).then(async()=>{d.close();await load();notice.textContent='Account archived. You can find it in the Archived accounts view.';}).catch(error=>{handleError(error,status);archive.disabled=false;});});archive.className='admin-danger';
 d.append(status,button('Cancel',()=>d.close()),archive);d.showModal();
}

refresh.onclick=()=>void load();
signout.onclick=()=>{setAdminIdentity(root,null);clear();locked('Sign in with your dzuy account.');void authClient()?.auth.signOut().then(result=>{if(result.error)handleError(new Error('Sign-out failed. Try again before leaving this shared device.'));}).catch(error=>handleError(error));};
let identity:string|null=null;
if(!document.documentElement.hasAttribute('data-admin-preview')){
authClient()?.auth.onAuthStateChange((event,session)=>{setAdminIdentity(root,session?.user??null);const next=session?.user.id??null;if(event==='SIGNED_OUT'||identity!==next){identity=next;clear();notice.textContent='Checking admin access…';setTimeout(()=>void load(),0);}});
void load();
}
