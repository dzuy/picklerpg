import {connect} from 'node:http2';
import {createPrivateKey,sign} from 'node:crypto';
export type APNsEnvironment='sandbox'|'production';
export interface APNsResult {status:number;reason?:string}
export type APNsSender=(token:string,environment:APNsEnvironment,payload:object,collapseId:string)=>Promise<APNsResult>;
/** Fixed Apple endpoints only. Credentials never leave the server. */
export function configuredAPNs(env:NodeJS.ProcessEnv,transport:typeof connect=connect):APNsSender|undefined {
 const {APNS_KEY_ID:keyId,APNS_TEAM_ID:teamId,APNS_PRIVATE_KEY:privateKey,APNS_TOPIC:topic}=env;
 if(!keyId||!teamId||!privateKey||!topic)return;
 const key=createPrivateKey(privateKey.replace(/\\n/g,'\n'));
 if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('APNs requires a P-256 key');
 let jwt='',issued=0;
 return async(token,environment,payload,collapseId)=>{
  const now=Math.floor(Date.now()/1000);
  if(!jwt||now-issued>3000){
   const header=Buffer.from(JSON.stringify({alg:'ES256',kid:keyId})).toString('base64url');
   const claims=Buffer.from(JSON.stringify({iss:teamId,iat:now})).toString('base64url');
   const data=`${header}.${claims}`;jwt=`${data}.${sign('sha256',Buffer.from(data),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;issued=now;
  }
  return new Promise<APNsResult>((resolve,reject)=>{
   const session=transport(environment==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com');
   const timer=setTimeout(()=>finish(Error('APNs timeout')),5000);let finished=false;
   function finish(error?:Error,result?:APNsResult){if(finished)return;finished=true;clearTimeout(timer);session.destroy();if(error)reject(error);else resolve(result!);}
   session.on('error',error=>finish(error));
   const request=session.request({':method':'POST',':path':`/3/device/${token}`,authorization:`bearer ${jwt}`,'apns-topic':topic,'apns-push-type':'alert','apns-priority':'10','apns-expiration':String(now+300),'apns-collapse-id':collapseId});
   let status=0,body='';request.on('response',headers=>{status=Number(headers[':status'])});request.setEncoding('utf8');
   request.on('data',chunk=>{body+=chunk});request.on('error',error=>finish(error));
   request.on('end',()=>{let reason;try{reason=JSON.parse(body).reason}catch{}finish(undefined,{status,reason})});request.end(JSON.stringify(payload));
  });
 };
}
