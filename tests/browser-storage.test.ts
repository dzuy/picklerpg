import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../src/browser-storage';

test('blocked browser storage falls back to a complete in-memory store',()=>{
 const safe=createSafeStorage(()=>{throw new DOMException('The operation is insecure.','SecurityError')});
 assert.equal(safe.persistent,false);assert.equal(safe.storage.length,0);
 safe.storage.setItem('match','one');safe.storage.setItem('roster','two');
 assert.equal(safe.storage.getItem('match'),'one');assert.equal(safe.storage.key(1),'roster');
 safe.storage.removeItem('match');assert.equal(safe.storage.getItem('match'),null);
 safe.storage.clear();assert.equal(safe.storage.length,0);
});

test('available browser storage is used after a non-destructive probe',()=>{
 const values=new Map<string,string>([['__picklebash_storage_probe__','existing']]);
 const storage={get length(){return values.size},clear:()=>values.clear(),getItem:(key:string)=>values.get(key)??null,key:(index:number)=>[...values.keys()][index]??null,removeItem:(key:string)=>{values.delete(key)},setItem:(key:string,value:string)=>{values.set(key,value)}} satisfies Storage;
 const safe=createSafeStorage(()=>storage);
 assert.equal(safe.persistent,true);assert.equal(storage.getItem('__picklebash_storage_probe__'),'existing');
 safe.storage.setItem('match','one');assert.equal(storage.getItem('match'),'one');assert.equal(safe.storage.getItem('match'),'one');
});

test('quota failure preserves readable durable data and rejects the unsaved write',()=>{
 const values=new Map([['saved','original']]);let full=false;
 const storage={get length(){return values.size},clear:()=>values.clear(),getItem:(k:string)=>values.get(k)??null,key:(i:number)=>[...values.keys()][i]??null,removeItem:(k:string)=>{values.delete(k)},setItem:(k:string,v:string)=>{if(full)throw new DOMException('full','QuotaExceededError');values.set(k,v)}};
 const safe=createSafeStorage(()=>storage);full=true;
 assert.throws(()=>safe.storage.setItem('next','lost'),{name:'QuotaExceededError'});
 assert.equal(safe.storage.getItem('saved'),'original');assert.equal(safe.storage.getItem('next'),null);
 const restarted=createSafeStorage(()=>storage);assert.equal(restarted.persistent,true);assert.equal(restarted.storage.getItem('saved'),'original');
 full=false;safe.storage.setItem('next','durable');assert.equal(values.get('next'),'durable');
});
