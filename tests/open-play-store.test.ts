import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {OpenPlayStore} from '../src/persistence/open-play-store';
const memory=()=>{const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>{values.delete(k)}}};
test('saving the active game does not read or rewrite historical payloads',()=>{
 const storage=memory(),writes:string[]=[],reads:string[]=[];
 const tracked={...storage,getItem:(k:string)=>{reads.push(k);return storage.getItem(k)},setItem:(k:string,v:string)=>{writes.push(k);storage.setItem(k,v)}};
 const store=new OpenPlayStore(tracked,'partitioned'),old=new Match(),current=new Match();
 store.save(old.exportCheckpoint(),'forest');store.save(current.exportCheckpoint(),'forest');
 writes.length=0;reads.length=0;store.save(current.exportCheckpoint(),'forest');
 assert.ok(writes.every(k=>!k.endsWith(old.matchId)));assert.ok(reads.every(k=>!k.endsWith(old.matchId)));
 storage.setItem(`${store.key}:game:${old.matchId}`,'broken history');
 assert.doesNotThrow(()=>store.save(current.exportCheckpoint(),'forest'));
 assert.equal(store.load(current.matchId)?.checkpoint.matchId,current.matchId);
});
test('old array migration retains the source when a payload write fails',()=>{
 const storage=memory(),match=new Match(),game={checkpoint:match.exportCheckpoint(),court:'forest',updatedAt:new Date().toISOString(),archived:false,ended:false};
 const raw=JSON.stringify([game]),key='pickle-open-play-v1:migration';storage.setItem(key,raw);
 const failing=new OpenPlayStore({...storage,setItem:()=>{throw Error('quota')}},'migration');
 assert.throws(()=>failing.list(),/Could not save/);assert.equal(storage.getItem(key),raw);
 const recovered=new OpenPlayStore(storage,'migration');assert.equal(recovered.load(match.matchId)?.court,'forest');
 assert.equal(JSON.parse(storage.getItem(key)!).version,2);
});
test('Open Play retains multiple games, exact committed turns and each court',()=>{
 const storage=memory(),store=new OpenPlayStore(storage,'a'),first=new Match(),second=new Match();
 first.partnerAutonomy=false;store.save(first.exportCheckpoint(),'venice');
 first.onCheckpoint=c=>store.save(c,'venice');first.submitIntent(first.availableIntents[0]);
 const committed=JSON.parse(JSON.stringify(first.exportCheckpoint()));store.save(second.exportCheckpoint(),'arizona');
 assert.equal(store.list().length,2);assert.deepEqual(store.load(first.matchId)?.checkpoint,committed);
 assert.equal(store.load(first.matchId)?.court,'venice');assert.equal(store.load(second.matchId)?.court,'arizona');
 assert.deepEqual(JSON.parse(JSON.stringify(Match.fromCheckpoint(store.load(first.matchId)!.checkpoint).exportCheckpoint())),committed);
 assert.equal(new OpenPlayStore(storage,'b').list().length,0);
});
test('archive, restore and end are per-game and survive reloading',()=>{
 const storage=memory(),store=new OpenPlayStore(storage,'a'),a=new Match(),b=new Match();
 store.save(a.exportCheckpoint(),'forest');store.save(b.exportCheckpoint(),'venice');store.archive(a.matchId,true);
 assert.equal(new OpenPlayStore(storage,'a').load(a.matchId)?.archived,true);assert.equal(store.load()?.checkpoint.matchId,b.matchId);
 store.archive(a.matchId,false);store.end(a.matchId);assert.equal(store.load(a.matchId)?.ended,true);assert.equal(store.load(b.matchId)?.ended,false);
 assert.throws(()=>store.archive('missing',true));
});
test('legacy checkpoint migrates once and remains intact for rollback',()=>{
 const storage=memory(),m=new Match(),legacy=JSON.stringify(m.exportCheckpoint());storage.setItem('pickle-rpg-match-v1:a',legacy);storage.setItem('picklebash-location-v1','arizona');
 const store=new OpenPlayStore(storage,'a');assert.equal(store.list().length,1);assert.equal(store.load()?.court,'arizona');
 store.archive(m.matchId,true);assert.equal(store.list().length,1);assert.equal(store.load(),null);assert.equal(storage.getItem('pickle-rpg-match-v1:a'),legacy);
});
test('unreadable catalogue and failed writes never silently replace saved games',()=>{
 const storage=memory(),store=new OpenPlayStore(storage,'a'),m=new Match();storage.setItem(store.key,'bad data');
 assert.throws(()=>store.save(m.exportCheckpoint(),'forest'));assert.equal(storage.getItem(store.key),'bad data');
 const failing=new OpenPlayStore({...memory(),setItem:()=>{throw new Error('quota')}},'b');assert.throws(()=>failing.save(m.exportCheckpoint(),'forest'),/Could not save/);
});

test('analysis retains every completed rally across saves and reloads without duplicating boundaries',()=>{
 const storage=memory(),store=new OpenPlayStore(storage,'analysis'),m=new Match();
 m.playerAutonomy=true;m.partnerAutonomy=true;m.reset();
 m.onCheckpoint=c=>store.save(c,'venice');store.save(m.exportCheckpoint(),'venice');
 const expected:unknown[]=[];
 for(let point=0;point<3;point++){
  for(let i=0;i<5000&&m.state.phase!=='complete';i++)m.update(.05);
  assert.equal(m.state.phase,'complete');
  const checkpoint=m.exportCheckpoint();expected.push(structuredClone(checkpoint.rally.state.rallyHistory));
  assert.deepEqual(store.load(m.matchId)!.analysis!.points.at(-1)!.events,checkpoint.rally.state.rallyHistory,'normal checkpoint saves capture the whole completed rally');
  store.save(checkpoint,'venice');store.save(checkpoint,'venice');
  if(point<2)m.nextPoint();
 }
 const saved=new OpenPlayStore(storage,'analysis').load(m.matchId)!;
 assert.equal(saved.analysis!.firstPoint,0);
 assert.equal(saved.analysis!.points.length,3);
 assert.deepEqual(saved.analysis!.points.map(p=>p.events),expected);
 assert.ok(saved.analysis!.points.every(p=>p.complete&&p.events.some(e=>e.type==='shot')&&p.events.some(e=>e.type==='point-end')));
 store.archive(m.matchId,true);assert.deepEqual(store.load(m.matchId)!.analysis,saved.analysis);
});

test('analysis marks partial coverage for games first recorded mid-match',()=>{
 const store=new OpenPlayStore(memory(),'partial'),m=new Match(),c=m.exportCheckpoint();c.pointIndex=9;
 store.save(c,'forest');assert.equal(store.load(m.matchId)!.analysis!.firstPoint,9);
});
