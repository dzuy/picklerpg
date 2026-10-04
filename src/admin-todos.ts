import {authClient} from './auth-session';
import {adminNavigation,setAdminIdentity} from './admin-navigation';
import {signInDialog} from './multiplayer/sign-in-dialog';
import {TODO_GROUPS,type AdminTodo,type AdminTodoList,type TodoGroup} from './admin-todos-contract';
import './admin-todos.css';

document.title='To-do List · PickleBash Admin';
document.body.classList.add('admin-users-page');
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<div class="admin-layout">${adminNavigation('todos')}<main class="admin-shell admin-todos"><header><div><h1>To-do List</h1><p>Your private project checklist.</p></div><div><button id="todo-refresh">Refresh</button> <button id="todo-add" hidden>Add task</button></div></header><p id="todo-notice" role="status" aria-live="polite"></p><section id="todo-content"></section><footer>Private · Only dzuy has access. Changes are saved automatically.</footer></main></div>`;
const content=root.querySelector<HTMLElement>('#todo-content')!,notice=root.querySelector<HTMLElement>('#todo-notice')!,add=root.querySelector<HTMLButtonElement>('#todo-add')!,refresh=root.querySelector<HTMLButtonElement>('#todo-refresh')!;
let generation=0,state:AdminTodoList|null=null,busy=false,query='',status='open',group='all';
class RequestError extends Error {constructor(public status:number,message:string){super(message)}}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
function button(text:string,action:()=>void){const b=el('button',text);b.type='button';b.onclick=action;return b;}
function clear(){generation++;state=null;busy=false;add.hidden=true;content.replaceChildren();document.querySelectorAll<HTMLDialogElement>('.todo-dialog').forEach(d=>{d.close();d.remove();});}
function locked(message:string){clear();notice.textContent=message;content.append(button('Sign in as dzuy',()=>signInDialog(load)));}
async function request(input?:unknown):Promise<AdminTodoList>{
 const stamp=generation,client=authClient(),session=client?(await client.auth.getSession()).data.session:null;
 if(stamp!==generation)throw new RequestError(0,'Session changed.');
 setAdminIdentity(root,session?.user??null);
 if(!session||session.user.is_anonymous)throw new RequestError(401,'Sign in with your dzuy owner account.');
 const response=await fetch('/api/admin/todos',{method:input?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,cache:'no-store'});
 const data=await response.json();if(stamp!==generation)throw new RequestError(0,'Session changed.');
 if(!response.ok)throw new RequestError(response.status,data.error?.message??'Could not save the list.');return data;
}
function errorMessage(error:unknown,target=notice){
 if(error instanceof RequestError&&error.status===0)return;
 if(error instanceof RequestError&&[401,403].includes(error.status)){locked(error.message);return;}
 target.textContent=error instanceof Error?error.message:'Could not load the list. Try Refresh.';
}
function setBusy(value:boolean){busy=value;add.disabled=value;refresh.disabled=value;content.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input[type=checkbox]').forEach(n=>n.disabled=value);}
async function mutate(input:object,target=notice,onSuccess?:()=>void){
 if(busy||!state)return;const stamp=generation;setBusy(true);target.textContent='Saving…';
 try{const data=await request({...input,version:state.version});if(stamp!==generation)return;state=data;render();target.textContent='Saved.';notice.textContent='Saved.';onSuccess?.();}
 catch(error){if(stamp===generation){errorMessage(error,target);if(state)drawRows();}}
 finally{if(stamp===generation)setBusy(false);}
}
function select(options:Record<string,string>,value:string,label:string){const s=el('select');s.setAttribute('aria-label',label);for(const [key,text] of Object.entries(options)){const o=el('option',text);o.value=key;s.append(o);}s.value=value;return s;}
let rows:HTMLElement;
function render(){
 if(!state)return;content.replaceChildren();add.hidden=false;
 const toolbar=el('div');toolbar.className='admin-toolbar';const search=el('input');search.type='search';search.placeholder='Search tasks';search.setAttribute('aria-label','Search tasks');search.value=query;
 const stateFilter=select({open:'Open',done:'Completed',all:'All tasks'},status,'Task status'),groupFilter=select({all:'All groups',...TODO_GROUPS},group,'Task group');
 search.oninput=()=>{query=search.value;drawRows();};stateFilter.onchange=()=>{status=stateFilter.value;drawRows();};groupFilter.onchange=()=>{group=groupFilter.value;drawRows();};
 toolbar.append(search,stateFilter,groupFilter);rows=el('div');content.append(toolbar,rows);drawRows();
}
function drawRows(){
 if(!state||!rows)return;rows.replaceChildren();const done=state.items.filter(i=>i.done).length;rows.append(el('p',`${state.items.length-done} open · ${done} completed`));
 const filtered=state.items.filter(i=>(status==='all'||i.done===(status==='done'))&&(group==='all'||i.group===group)&&`${i.title} ${i.notes}`.toLowerCase().includes(query.trim().toLowerCase()));
 if(!filtered.length){rows.append(el('p',state.items.length?'No tasks match these filters.':'Your list is empty. Add a task to get started.'));return;}
 for(const [key,label] of Object.entries(TODO_GROUPS)){
  const items=filtered.filter(i=>i.group===key);if(!items.length)continue;const section=el('section');section.className='todo-group';section.append(el('h2',`${label} (${items.length})`));
  for(const item of items){const row=el('article');row.className='todo-row';const check=el('input');check.type='checkbox';check.checked=item.done;check.disabled=busy;check.setAttribute('aria-label',`${item.done?'Reopen':'Complete'}: ${item.title}`);check.onchange=()=>void mutate({action:'edit',item:{...item,done:check.checked}});
   const text=el('div'),title=el('h3',item.title);if(item.done)title.className='todo-done';text.append(title);if(item.notes){const notes=el('p',item.notes);notes.className='todo-notes';text.append(notes);}
   const edit=button('Edit',()=>editor(item));edit.disabled=busy;edit.setAttribute('aria-label',`Edit: ${item.title}`);row.append(check,text,edit);section.append(row);
  }rows.append(section);
 }
}
function editor(item?:AdminTodo){
 if(busy||!state)return;const d=el('dialog');d.className='admin-dialog todo-dialog';const close=button('Close',()=>d.close()),heading=el('h2',item?'Edit task':'Add task');heading.id='todo-editor-title';d.setAttribute('aria-labelledby',heading.id);
 const form=el('form'),title=el('input'),notes=el('textarea'),category=select(TODO_GROUPS,item?.group??(group==='all'?'next':group),'Task group');title.value=item?.title??'';title.required=true;title.maxLength=160;notes.value=item?.notes??'';notes.maxLength=4000;notes.rows=7;
 for(const [name,field] of [['Title',title],['Notes',notes],['Group',category]] as const){const label=el('label',name);label.append(field);form.append(label);}
 const message=el('p');message.setAttribute('role','status');const save=el('button','Save task');save.type='submit';
 const reload=button('Refresh list, keep draft',()=>{if(busy)return;const stamp=generation;setBusy(true);save.disabled=true;message.textContent='Refreshing…';void request().then(data=>{if(stamp!==generation)return;state=data;render();message.textContent='List refreshed. Your draft is unchanged; save when ready.';}).catch(e=>errorMessage(e,message)).finally(()=>{if(stamp===generation){setBusy(false);save.disabled=false;}});});
 form.append(save,message,reload);form.onsubmit=e=>{e.preventDefault();if(busy)return;save.disabled=true;void mutate({action:item?'edit':'add',item:{id:item?.id??crypto.randomUUID(),title:title.value,notes:notes.value,group:category.value as TodoGroup,done:item?.done??false}},message,()=>d.close()).finally(()=>save.disabled=false);};
 d.append(close,heading,form);
 if(item){const remove=button('Delete task',()=>{if(busy)return;remove.hidden=true;const confirm=button('Yes, delete task',()=>void mutate({action:'delete',id:item.id},message,()=>d.close()));confirm.className='admin-danger';const cancel=button('Keep task',()=>{confirm.remove();cancel.remove();remove.hidden=false;});d.append(confirm,cancel);});remove.className='admin-danger';d.append(remove);}
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();title.focus();
}
async function load(){
 clear();const stamp=generation;refresh.disabled=true;notice.textContent='Checking owner access…';
 try{const data=await request();if(stamp!==generation)return;state=data;render();notice.textContent='List updated.';}catch(e){if(stamp===generation)errorMessage(e);}finally{refresh.disabled=false;}
}
add.onclick=()=>editor();refresh.onclick=()=>void load();
root.querySelector<HTMLButtonElement>('#admin-signout')!.onclick=()=>{setAdminIdentity(root,null);locked('Sign in with your dzuy owner account.');void authClient()?.auth.signOut().then(r=>{if(r.error)notice.textContent='Sign-out failed. Try again before leaving this device.';}).catch(()=>{notice.textContent='Sign-out failed. Try again before leaving this device.';});};
let identity:string|null=null;
authClient()?.auth.onAuthStateChange((event,session)=>{setAdminIdentity(root,session?.user??null);const next=session?.user.id??null;if(event==='SIGNED_OUT'||identity!==next){identity=next;clear();setTimeout(()=>void load(),0);}});
void load();
