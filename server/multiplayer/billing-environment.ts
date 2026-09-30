import {ApiError} from './errors';
import {uuid} from './validation';

export function billingSandbox(env:NodeJS.ProcessEnv){
 if(env.BILLING_ENVIRONMENT&&env.BILLING_ENVIRONMENT!=='production'&&env.BILLING_ENVIRONMENT!=='sandbox')throw new Error('Invalid BILLING_ENVIRONMENT');
 return env.BILLING_ENVIRONMENT==='sandbox';
}
/** Dedicated non-paying review accounts may receive verified Apple sandbox receipts. */
export function appleSandboxAccount(actor:string,env:NodeJS.ProcessEnv){
 return !billingSandbox(env)&&(env.APPLE_SANDBOX_ACCOUNT_IDS??'').split(',').map(id=>id.trim()).filter(Boolean).includes(actor);
}
export function appleSandboxForAccount(actor:string,env:NodeJS.ProcessEnv){return billingSandbox(env)||appleSandboxAccount(actor,env);}
export function stripeEnvironmentMatches(value:{livemode?:boolean},env:NodeJS.ProcessEnv){return value.livemode===!billingSandbox(env);}
export function validateBillingEnvironment(env:NodeJS.ProcessEnv){
 const accounts=(env.APPLE_SANDBOX_ACCOUNT_IDS??'').split(',').map(id=>id.trim()).filter(Boolean);
 if(accounts.length>20||accounts.some(id=>!uuid(id)))throw new Error('Apple sandbox accounts must be explicit account UUIDs (at most 20)');
 const sandbox=billingSandbox(env),key=env.STRIPE_SECRET_KEY;
 if(key&&!new RegExp(`^(rk|sk)_${sandbox?'test':'live'}_`).test(key))throw new ApiError(503,'billing_environment','Purchases are not configured for this environment.');
 if(sandbox){
  const database=env.SUPABASE_URL??env.VITE_SUPABASE_URL;
  if(!database||database.includes('vwdtfnljcjbyokdvjiea')||database!==env.BILLING_SANDBOX_SUPABASE_URL)throw new Error('Sandbox billing requires its own explicitly confirmed database');
 }
}
