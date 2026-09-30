import {createClient} from '@supabase/supabase-js';
import {PLAYER_CARD_BUCKET,MAX_CARD_BYTES} from '../../server/multiplayer/player-cards';
const url=process.env.SUPABASE_URL??process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Set the existing server Supabase configuration first.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:existing,error:readError}=await client.storage.getBucket(PLAYER_CARD_BUCKET);
if(readError&&String((readError as {statusCode?:string}).statusCode)!=='404'&&!/not found/i.test(readError.message))throw new Error('Could not inspect player card storage.');
if(!existing){const {error}=await client.storage.createBucket(PLAYER_CARD_BUCKET,{public:true,fileSizeLimit:MAX_CARD_BYTES,allowedMimeTypes:['image/png']});if(error)throw new Error('Could not create player card storage.');}
const {data:bucket,error}=await client.storage.getBucket(PLAYER_CARD_BUCKET);
if(error||!bucket?.public||Number(bucket.file_size_limit)!==MAX_CARD_BYTES||bucket.allowed_mime_types?.join(',')!=='image/png')throw new Error('Existing bucket settings differ; no settings were changed.');
console.log(`Public PNG card storage ready on ${new URL(url).hostname}: ${PLAYER_CARD_BUCKET}. Browser write policies are not added.`);
