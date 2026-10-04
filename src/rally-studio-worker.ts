import {matchingStart,recordStudioTake,simulateStudioCandidate,type StudioRequest} from './rally-studio-model';
self.onmessage=(event:MessageEvent<StudioRequest>)=>{
 try{
  const request=event.data;
  for(let attempt=0;attempt<request.attempts;attempt++){
   const seed=(request.seed+attempt)>>>0,match=simulateStudioCandidate(request,seed);
   if(matchingStart(match,request.brief,request.scope)!==null){const take=recordStudioTake(request,seed,attempt+1);if(take){self.postMessage({take});return}}
   if(attempt%5===0)self.postMessage({progress:attempt+1});
  }
  self.postMessage({error:`No matching take in ${request.attempts} real rallies. Try a wider hit range, a finishing excerpt, or different player styles.`});
 }catch(error){self.postMessage({error:(error as Error).message})}
};
