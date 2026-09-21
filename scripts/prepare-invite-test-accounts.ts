/** Explicit live test setup. Creates only dedicated test identities; never updates existing users. */
import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const url=process.env.SUPABASE_URL;
if(!process.argv.includes('--run-live')||!url||new URL(url).hostname!=='vwdtfnljcjbyokdvjiea.supabase.co')throw Error('Pass --run-live with the configured PickleBash test project.');
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const file='.multiplayer-test-accounts.json';
type Account={email:string;password:string;id?:string};
let accounts:Record<string,Account>;
try{accounts=JSON.parse(await readFile(file,'utf8'));}catch(error:any){if(error.code!=='ENOENT')throw error;accounts={};}
for(const name of ['a','b']){
 const account=accounts[name]??={email:`invite-qa-${name}-${randomUUID()}@picklebash-test.invalid`,password:randomBytes(32).toString('base64url')};
 if(!account.id){
  await writeFile(file,JSON.stringify(accounts,null,2)+'\n',{mode:0o600});
  const {data,error}=await admin.auth.admin.createUser({email:account.email,password:account.password,email_confirm:true,user_metadata:{player_name:`Invite QA ${name.toUpperCase()}`,username:`inviteqa_${name}_${randomBytes(4).toString('hex')}`,purpose:'invitation-storage-regression',roster_starters:['preset-0','preset-1']},app_metadata:{multiplayer_playtest:name!=='outsider'}});
  if(error||!data.user)throw Error(`Could not create tester ${name}: ${error?.code??'unknown'}`);
  account.id=data.user.id;await writeFile(file,JSON.stringify(accounts,null,2)+'\n',{mode:0o600});
 }
 console.log(`Dedicated tester ${name.toUpperCase()} ready.`);
}
