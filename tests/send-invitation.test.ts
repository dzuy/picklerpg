import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendInvitationDraft} from '../src/multiplayer/send-invitation';
import {RemoteError} from '../src/multiplayer/api';
import type {InviteRequest} from '../src/multiplayer/invitation-protocol';
const old={requestId:'old'} as InviteRequest,newDraft={requestId:'new'} as InviteRequest;
test('rejected saved invitation is rebuilt from current selections',async()=>{
 const sent:string[]=[],stored:(string|null)[]=[];
 await sendInvitationDraft(JSON.stringify(old),async()=>newDraft,v=>stored.push(v),async r=>{sent.push(r.requestId);if(r.requestId==='old')throw new RemoteError(400,'invitation','Invalid draft')});
 assert.deepEqual(sent,['old','new']);assert.equal(stored.at(-1),null);
});
test('uncertain network failure retains the request and never sends a replacement',async()=>{
 let fresh=0,stored:string|null=null,sends=0;
 await assert.rejects(sendInvitationDraft(JSON.stringify(old),async()=>{fresh++;return newDraft},v=>stored=v,async()=>{sends++;throw new RemoteError(503,'unavailable','Offline')}));
 assert.equal(fresh,0);assert.equal(sends,1);assert.equal(stored,JSON.stringify(old));
});
test('new rejected invitation is cleared so selections can be corrected',async()=>{
 let stored:string|null=null,sends=0;
 await assert.rejects(sendInvitationDraft(null,async()=>newDraft,v=>stored=v,async()=>{sends++;throw new RemoteError(400,'team','Invalid team')}));
 assert.equal(sends,1);assert.equal(stored,null);
});
