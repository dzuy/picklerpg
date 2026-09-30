import {matchCredentials} from './auth-session';
import {apiUrl} from './native-origin';
export async function publishPlayerCard(blob:Blob):Promise<string>{
 const {token}=await matchCredentials();
 const response=await fetch(apiUrl('/api/player-cards'),{method:'POST',headers:{'Content-Type':'image/png',Authorization:`Bearer ${token}`},body:blob,signal:AbortSignal.timeout(45000)});
 let value;try{value=await response.json();}catch{throw new Error('Your card could not be published. You can download it or try again.');}
 if(!response.ok)throw new Error(value.error?.message??'Your card could not be published. Please try again.');
 if(typeof value.url!=='string'||!value.url.startsWith('https://'))throw new Error('The public card link is unavailable. Please try again.');
 return value.url;
}
