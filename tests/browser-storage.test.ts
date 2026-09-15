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

test('storage that becomes blocked later switches to memory without throwing',()=>{
 const values=new Map<string,string>();let blocked=false;
 const check=()=>{if(blocked)throw new DOMException('The operation is insecure.','SecurityError')};
 const storage={get length(){check();return values.size},clear:()=>{check();values.clear()},getItem:(key:string)=>{check();return values.get(key)??null},key:(index:number)=>{check();return [...values.keys()][index]??null},removeItem:(key:string)=>{check();values.delete(key)},setItem:(key:string,value:string)=>{check();values.set(key,value)}} satisfies Storage;
 const safe=createSafeStorage(()=>storage);
 assert.equal(safe.persistent,true);blocked=true;
 safe.storage.setItem('match','temporary');
 assert.equal(safe.storage.getItem('match'),'temporary');assert.equal(safe.storage.length,1);
});
