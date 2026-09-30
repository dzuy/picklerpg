/** Process one owner-requested deletion. Never accepts an arbitrary unrequested account. */
import {createClient} from '@supabase/supabase-js';
const account=process.argv.find(x=>x.startsWith('--account='))?.slice(10),execute=process.argv.includes('--execute');
if(!account||!/^[a-f0-9-]{36}$/i.test(account))throw Error('Use --account=<requested UUID>; default is dry-run.');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Configure server credentials.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:request,error}=await db.from('account_deletion_requests').select('account_id,completed_at').eq('account_id',account).maybeSingle();if(error||!request)throw Error('No verified deletion request for this account.');
if(request.completed_at&&process.argv.includes('--external-cleanup-complete')&&execute){const {error}=await db.from('account_deletion_requests').update({external_cleanup_completed_at:new Date().toISOString()}).eq('account_id',account);if(error)throw Error('Could not record completion.');console.log('External cleanup completion recorded.');process.exit(0)}
if(request.completed_at){console.log('Account deletion already completed; finish external cleanup according to docs/ACCOUNT-SAFETY.md.');process.exit(0)}
if(!execute){console.log('Verified request exists. No data changed. Use --execute to process this specific request.');process.exit(0)}
const {data:cards,error:cardError}=await db.from('published_player_cards').select('path').eq('owner_id',account);if(cardError)throw Error('Card ownership lookup failed; no account deleted.');
for(let i=0;i<(cards??[]).length;i+=100){const {error}=await db.storage.from('player-cards').remove(cards!.slice(i,i+100).map(card=>card.path));if(error)throw Error('Hosted-card cleanup failed; request retained.');}
const {error:deleted}=await db.auth.admin.deleteUser(account);if(deleted)throw Error('Deletion failed. Request retained; check database migration and retry.');
console.log('Account and database cleanup completed. Provider/analytics cleanup must be verified before closing the request.');
