import test from 'node:test';
import assert from 'node:assert/strict';
import {NativePushService,parseDevice} from '../server/multiplayer/native-push';
import {NotificationService} from '../server/multiplayer/push';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const event={userId:A,matchId:B,version:1,opponentName:'Pat'};
function store(tokens=['ok','gone']){
 const operations:any[]=[];
 const client:any={rpc:async(name:string)=>({data:name==='turn_badge_count'?3:true}),from:(table:string)=>{
  const op:any={table,filters:[]};operations.push(op);
  const q:any={select:()=>q,update:(data:any)=>{op.update=data;return q},eq:(...args:any[])=>{op.filters.push(args);return q},maybeSingle:async()=>({data:{home_user_id:A,away_user_id:B}}),then:(resolve:any)=>Promise.resolve({data:table==='push_devices'?tokens.map(id=>({id,device_token:id,environment:'production',updated_at:'v1'})):[]}).then(resolve)};return q;
 }};return {client,operations};
}
test('strict APNs registration rejects arbitrary tokens and environments',()=>{
 assert.equal(parseDevice({id:A,token:'AB'.repeat(32),environment:'sandbox'}).token,'ab'.repeat(32));
 for(const input of [null,{}, {id:A,token:'x'.repeat(64),environment:'production'},{id:A,token:'a'.repeat(64),environment:'https://evil.test'}])assert.throws(()=>parseDevice(input));
});
test('all iOS devices receive structured turn payload and authoritative badge; stale failures are guarded',async()=>{
 const db=store(),sent:any[]=[];
 const service=new NativePushService(db.client,async(token,environment,payload)=>{sent.push({token,environment,payload});return token==='gone'?{status:410,reason:'Unregistered'}:{status:200};});
 assert.equal(await service.deliver(A,event),true);assert.equal(sent.length,2);
 assert.deepEqual(sent[0].payload,{aps:{alert:{title:'Your turn',body:"Pat just played. You're up."},sound:'default',badge:3},type:'your_turn',gameId:B});
 const disabled=db.operations.find(op=>op.update);assert.deepEqual(disabled.filters,[['id','gone'],['user_id',A],['device_token','gone'],['updated_at','v1']]);
});
test('APNs success chooses native; no devices or failed APNs invoke existing fallback once',async()=>{
 for(const mode of ['success','failure','absent']){
  const db=store(mode==='absent'?[]:['ok']);let fallback=0;
  const native=new NativePushService(db.client,async()=>({status:mode==='success'?200:503}));
  const notifications=new NotificationService(db.client,'','','',undefined,native,async()=>{fallback++});
  await notifications.notify(event);assert.equal(fallback,mode==='success'?0:1);
 }
});
test('badge-only pushes contain no alert and include zero; transient failures remain retryable',async()=>{
 const db=store(['ok']);db.client.rpc=async()=>({data:0});let payload:any;
 const native=new NativePushService(db.client,async(_t,_e,value)=>{payload=value;return {status:200}});
 await native.deliver(A);assert.deepEqual(payload,{aps:{badge:0},type:'badge_sync'});
 await assert.rejects(new NativePushService(db.client,async()=>{throw Error('offline')}).deliver(A));
});

test('APNs uses ES256 provider authentication, fixed environment endpoints and badge-capable alert headers',async()=>{
 const {configuredAPNs}=await import('../server/multiplayer/apns');
 const {generateKeyPairSync,verify}=await import('node:crypto');const {EventEmitter}=await import('node:events');
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const calls:any[]=[];
 const transport:any=(host:string)=>{
  const session:any=new EventEmitter();session.destroy=()=>{};
  session.request=(headers:any)=>{const request:any=new EventEmitter();request.setEncoding=()=>{};request.end=(body:string)=>{calls.push({host,headers,body});queueMicrotask(()=>{request.emit('response',{':status':200});request.emit('end')})};return request;};return session;
 };
 const send=configuredAPNs({APNS_TEAM_ID:'TEAM',APNS_KEY_ID:'KEY',APNS_TOPIC:'com.picklebash.app',APNS_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}).toString()},transport)!;
 for(const environment of ['sandbox','production'] as const)assert.equal((await send('a'.repeat(64),environment,{aps:{badge:0}},'turn-badge')).status,200);
 assert.equal(calls[0].host,'https://api.sandbox.push.apple.com');assert.equal(calls[1].host,'https://api.push.apple.com');
 const headers=calls[0].headers;assert.equal(headers['apns-push-type'],'alert');assert.equal(headers['apns-topic'],'com.picklebash.app');assert.equal(headers['apns-collapse-id'],'turn-badge');
 const [head,body,signature]=headers.authorization.slice(7).split('.');
 assert.deepEqual(JSON.parse(Buffer.from(head,'base64url').toString()),{alg:'ES256',kid:'KEY'});
 assert.equal(JSON.parse(Buffer.from(body,'base64url').toString()).iss,'TEAM');
 assert.equal(verify('sha256',Buffer.from(`${head}.${body}`),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')),true);
 assert.equal(calls[0].headers.authorization,calls[1].headers.authorization,'provider JWT is cached');
});
