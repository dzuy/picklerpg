import {authClient} from './auth-session';
import {registeredBetaUser,betaDestination} from './beta-access-policy';
import {createYourPlayer} from './multiplayer/friend-flow';
import {signInDialog} from './multiplayer/sign-in-dialog';
import './multiplayer/lobby.css';
import './beta-access.css';

/** No gameplay module is loaded until the persistent session belongs to a real account. */
export async function webBetaAccess(url:URL):Promise<boolean>{
 const client=authClient();
 let failure='';
 try{
  if(!client)throw Error('Account access is unavailable. Please try again later.');
  const {data:{session},error}=await client.auth.getSession();
  if(error)throw error;
  if(registeredBetaUser(session?.user)){
   client.auth.onAuthStateChange((event,next)=>{
    if(event!=='INITIAL_SESSION'&&!registeredBetaUser(next?.user))setTimeout(()=>location.reload(),0);
   });
   return true;
  }
 }catch{failure='Couldn’t check your account. Please try again.';}
 document.querySelector('#match-loading')?.setAttribute('hidden','');
 document.body.dataset.screen='beta-access';
 const destination=betaDestination(url);
 const surface=document.createElement('main');surface.className='beta-access';
 surface.innerHTML=`<a href="/" aria-label="PickleBash home"><img src="/images/start/picklebash-logo.png" width="300" height="140" alt="PickleBash"></a><section><p class="beta-eyebrow">YOUR EARLY ACCESS SNEAK PEEK</p><h1>Welcome to the court.</h1><p>Get a first look at PickleBash. Make your player, bring your friends, and start your next rivalry.</p><p>Create an account to start playing the web beta right away.</p><button type="button" data-create>Get Beta Access</button><button type="button" data-signin>Already playing? Sign in</button><p role="status" aria-live="polite"></p><a href="/">Back to the sneak peek</a></section>`;
 document.body.append(surface);
 const status=surface.querySelector<HTMLElement>('[role=status]')!;
 status.textContent=failure;
 async function verify(){
  const {data:{session},error}=await client!.auth.getSession();
  if(error||!registeredBetaUser(session?.user))throw Error('Please finish signing in to start playing.');
 }
 const signedIn=async()=>{await verify();location.replace(destination);};
 const create=async()=>{
  status.textContent='';
  const button=surface.querySelector<HTMLButtonElement>('[data-create]')!;
  button.disabled=true;
  try{
   let created=false;
   const completed=await createYourPlayer(async()=>{await verify();created=true;},{onSignIn:signedIn,completionDestination:destination});
   // An account may have been installed in another tab before the dialog opened.
   if(completed&&!created)await signedIn();
  }catch(error){status.textContent=(error as Error).message;}
  finally{button.disabled=false;}
 };
 surface.querySelector<HTMLButtonElement>('[data-create]')!.onclick=()=>void create();
 surface.querySelector<HTMLButtonElement>('[data-signin]')!.onclick=()=>signInDialog(signedIn,()=>void create(),destination);
 if(!failure){if(url.searchParams.get('beta')==='signin')signInDialog(signedIn,()=>void create(),destination);else await create();}
 return false;
}
