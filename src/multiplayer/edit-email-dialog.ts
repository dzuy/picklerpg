import {authClient} from '../auth-session';
import {hudButtonIcon} from '../hud-button';

export function editEmailDialog(owner:string,currentEmail:string,onUpdated:(email:string,pending:string)=>void){
 const existing=document.querySelector<HTMLDialogElement>('#profile-edit-email');if(existing){existing.querySelector('input')?.focus();return;}
 const dialog=document.createElement('dialog');dialog.id='profile-edit-email';dialog.className='friend-dialog profile-sign-in';dialog.setAttribute('aria-labelledby','profile-edit-email-title');
 dialog.innerHTML=`<button type="button" class="profile-sign-in-close" aria-label="Close edit email">${hudButtonIcon('close')}</button><h1 id="profile-edit-email-title">Edit email</h1><form><label>Email address<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required maxlength="254"></label><button type="submit" class="remote-primary">Save email</button><p role="status" aria-live="polite"></p></form>`;
 const form=dialog.querySelector('form')!,input=form.elements.namedItem('email') as HTMLInputElement,save=form.querySelector('button')!,message=form.querySelector('p')!;
 input.value=currentEmail;
 dialog.querySelector('button')!.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 form.onsubmit=event=>{event.preventDefault();if(save.disabled)return;const email=input.value.trim();if(email.toLowerCase()===currentEmail.toLowerCase()){message.textContent='Enter a different email address.';return;}save.disabled=true;input.disabled=true;message.textContent='Saving your email…';
  void(async()=>{
   const client=authClient();if(!client)throw Error('Account settings are unavailable. Please try again later.');
   const session=await client.auth.getSession();if(session.error)throw session.error;if(session.data.session?.user.id!==owner)throw Error('Your account changed. Close this window and sign in again.');
   const {data,error}=await client.auth.updateUser({email},{emailRedirectTo:new URL('/?openplay=1&tab=profile',location.origin).href});if(error)throw error;
   const updated=data.user?.email??currentEmail,pending=updated.toLowerCase()===email.toLowerCase()?'':email;
   onUpdated(updated,pending);
   message.textContent=pending?'Check your new and current email inboxes for confirmation instructions. Your current email stays active until the change is confirmed.':'Your email address has been updated.';
   save.hidden=true;
  })().catch(error=>{message.textContent=(error as Error).message;}).finally(()=>{save.disabled=false;input.disabled=false;});
 };
 document.body.append(dialog);dialog.showModal();input.focus();
}
