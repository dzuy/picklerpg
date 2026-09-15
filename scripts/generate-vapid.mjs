import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import webpush from 'web-push';
const target=process.argv[2];
if(!target)throw new Error('Provide a private output file path. Existing files will not be overwritten.');
const {publicKey,privateKey}=webpush.generateVAPIDKeys();
await writeFile(resolve(target),`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=mailto:REPLACE_WITH_YOUR_CONTACT\n`,{mode:0o600,flag:'wx'});
console.log('VAPID configuration written with owner-only permissions. Set your contact address and copy the three values into Railway runtime variables. Keep this file private.');
