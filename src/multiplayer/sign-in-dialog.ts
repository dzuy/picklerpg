import {remoteRequest} from './api';
import {authClient} from '../auth-session';
import {hudButtonIcon} from '../hud-button';

export function signInDialog(onSignedIn:()=>Promise<void>){
 const existing=document.querySelector<HTMLDialogElement>('#profile-sign-in');if(existing){existing.querySelector<HTMLInputElement>('input')?.focus();return;}
 const dialog=document.createElement('dialog');dialog.id='profile-sign-in';dialog.className='friend-dialog profile-sign-in';dialog.setAttribute('aria-labelledby','profile-sign-in-title');
 dialog.innerHTML=`<button type="button" class="profile-sign-in-close" aria-label="Close sign in">${hudButtonIcon('close')}</button><h1 id="profile-sign-in-title">Sign in</h1><form><label>Username or email<input name="identifier" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit" class="remote-primary">Sign in</button><p role="status" aria-live="polite"></p></form>`;
 const form=dialog.querySelector('form')!,identifier=form.elements.namedItem('identifier') as HTMLInputElement,password=form.elements.namedItem('password') as HTMLInputElement,submit=form.querySelector('button')!,message=form.querySelector('p')!;
 dialog.querySelector('button')!.onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{password.value='';dialog.remove();});
 form.onsubmit=event=>{event.preventDefault();if(submit.disabled)return;submit.disabled=true;submit.textContent='Signing in…';message.textContent='';
 void(async()=>{const client=authClient();if(!client)throw Error('Sign in is unavailable. Please try again later.');const session=await remoteRequest<{access_token:string;refresh_token:string}>('','/api/multiplayer/sign-in',{identifier:identifier.value.trim(),password:password.value});const {error}=await client.auth.setSession(session);if(error)throw Error('Could not finish signing in. Please try again.');password.value='';await onSignedIn();dialog.close();})().catch(error=>{message.textContent=(error as Error).message;}).finally(()=>{submit.disabled=false;submit.textContent='Sign in';});
 };
 document.body.append(dialog);dialog.showModal();identifier.focus();
}
