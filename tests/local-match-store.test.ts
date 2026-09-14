import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalMatchStore,type MatchStorage} from '../src/persistence/local-match-store';
import {Match} from '../src/match';
function storage(){const values=new Map<string,string>();const api:MatchStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)}};return {api,values};}
test('local store resumes another session with identical identity and is account scoped',()=>{
 const {api}=storage(),a=new LocalMatchStore(api,'a'),b=new LocalMatchStore(api,'b');const m=new Match();m.onCheckpoint=c=>a.save(c);m.saveBoundary();m.submitIntent(m.availableIntents[0]);
 const r=Match.fromCheckpoint(new LocalMatchStore(api,'a').load());assert.equal(r.matchId,m.matchId);assert.deepEqual(JSON.parse(JSON.stringify(r.exportCheckpoint())),a.load());assert.equal(b.load(),null);
});
test('corrupt and future saves survive load and attempted writes until explicit discard',()=>{
 const {api,values}=storage();for(const raw of ['{bad',JSON.stringify({...new Match().exportCheckpoint(),schemaVersion:99})]){
  const store=new LocalMatchStore(api,'a');values.set(store.key,raw);assert.throws(()=>store.load());assert.throws(()=>store.save(new Match().exportCheckpoint()));assert.equal(values.get(store.key),raw);store.discard();store.save(new Match().exportCheckpoint());assert.ok(store.load());
 }
});
test('storage failure preserves the previous committed turn and rolls back the new choice',()=>{
 const {api}=storage(),store=new LocalMatchStore(api,'a');const m=new Match();m.onCheckpoint=c=>store.save(c);m.saveBoundary();const before=store.load();api.setItem=()=>{throw new Error('QuotaExceededError')};
 assert.throws(()=>m.submitIntent(m.availableIntents[0]),/Could not save/);assert.deepEqual(store.load(),before);assert.deepEqual(JSON.parse(JSON.stringify(m.exportCheckpoint())),before);
});
