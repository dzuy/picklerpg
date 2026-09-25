import {validateCommand,type ParsedCommand} from './engine/custom-command';
import {apiUrl} from './native-origin';

/** Always interpret free text with the model; menu options are not a vocabulary limit. */
export async function interpretShot(text:string,context:unknown,signal?:AbortSignal):Promise<ParsedCommand>{
 const command=text.trim();
 if(!command||command.length>240)throw Error('Describe a shot using 1–240 characters.');
 const response=await fetch(apiUrl('/api/command'),{method:'POST',headers:{'Content-Type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000),body:JSON.stringify({version:1,command,context,options:[{}]})});
 if(!response.ok)throw Error('Shot interpretation is unavailable right now. Your shot has not been played. Try again.');
 return validateCommand(await response.json());
}
