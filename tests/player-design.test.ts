import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerId,newPlayer,parseLibrary,savePlayer,deletePlayer,validatePlayer,PLAYER_STORAGE_KEY} from '../src/player-design';
import {Match} from '../src/match';
import {PLAYER_PROFILES} from '../src/engine/player-profiles';

test('multiple player profiles round-trip independently with an active selection',()=>{
 let saved='';const storage={setItem:(key:string,value:string)=>{assert.equal(key,PLAYER_STORAGE_KEY);saved=value}};
 const first=newPlayer('first');first.name='  River  ';first.appearance.hat='visor';first.skills.drive=92;
 let library=savePlayer(storage,parseLibrary(null),first,true);
 const second=newPlayer('second');second.name='Sky';second.skills.dink=99;
 library=savePlayer(storage,library,second);
 const loaded=parseLibrary(saved);assert.equal(loaded.players.length,2);assert.equal(loaded.activeId,'first');
 assert.equal(loaded.players[0].name,'River');assert.equal(loaded.players[0].skills.drive,92);
 second.skills.dink=0;assert.equal(loaded.players[1].skills.dink,99);
 first.name='River 2';library=savePlayer(storage,library,first);
 assert.equal(library.players.length,2);assert.equal(library.players.find(p=>p.id==='first')?.name,'River 2');
});
test('invalid names, colors, options and skills cannot enter a saved roster',()=>{
 for(const mutate of [(p:ReturnType<typeof newPlayer>)=>p.name=' ',p=>p.name='x'.repeat(25),p=>p.appearance.skin='bad',p=>p.skills.drive=101,p=>p.skills.dink=-1,p=>p.skills.hands=NaN,p=>p.skills.serve=1.5]){
  const p=newPlayer('test');mutate(p);assert.throws(()=>validatePlayer(p));
 }
 const p=newPlayer('test');assert.throws(()=>validatePlayer({...p,appearance:{...p.appearance,hat:'invalid'}}));
 assert.throws(()=>parseLibrary('{'));assert.throws(()=>parseLibrary(JSON.stringify({version:2,players:[]})));
 assert.throws(()=>parseLibrary(JSON.stringify({version:1,activeId:'missing',players:[p]})));
 assert.throws(()=>parseLibrary(JSON.stringify({version:1,activeId:null,players:[p,p]})));
});
test('failed persistence does not mutate the library or draft',()=>{
 const library=parseLibrary(null),draft=newPlayer('test'),before=structuredClone(draft);
 assert.throws(()=>savePlayer({setItem:()=>{throw new Error('quota')}},library,draft,true));
 assert.deepEqual(library,parseLibrary(null));assert.deepEqual(draft,before);
});
test('custom skills and hand apply to match execution and survive restarts and new points',()=>{
 const match=new Match(),player=newPlayer('test');player.skills.serve=12;player.skills.drive=91;player.skills.dink=96;player.handedness='left';
 match.setPlayerDesign(player);player.skills.drive=0;
 const verify=()=>{const you=match.state.players.find(p=>p.id==='you')!;assert.equal(you.skills.drive,91);assert.equal(you.skills.dink,96);assert.equal(you.handedness,'left');assert.deepEqual(match.state.players.find(p=>p.id==='partner')!.skills,PLAYER_PROFILES.partner.skills)};
 verify();match.submitIntent(match.availableIntents[0]);assert.equal(match.shot.feedback?.skill,12);
 match.reset();verify();match.state.phase='complete';match.nextPoint();verify();
 match.startPractice('middle');verify();
 match.setPlayerDesign(null);assert.deepEqual(match.state.players.find(p=>p.id==='you')!.skills,PLAYER_PROFILES.you.skills);
});
test('a saved player overrides only the user archetype and leaves global defaults untouched',()=>{
 const match=new Match(),player=newPlayer('test');match.lineup.you='attacker';player.skills.drive=23;match.setPlayerDesign(player);
 assert.equal(match.state.players.find(p=>p.id==='you')!.skills.drive,23);
 assert.equal(PLAYER_PROFILES.you.skills.drive,70);
 const snapshot=match.playerDesign!;snapshot.skills.drive=100;
 match.reset();assert.equal(match.state.players.find(p=>p.id==='you')!.skills.drive,23);
});

test('legacy saved players gain outfit defaults without losing their name, colors or skills',()=>{
 const player=newPlayer('legacy');player.name='Jarvis';player.skills.drive=83;
 const legacy=JSON.parse(JSON.stringify(player));
 for(const key of ['top','bottom','accessory','shoes','paddle'])delete legacy.appearance[key];
 const loaded=parseLibrary(JSON.stringify({version:1,activeId:'legacy',players:[legacy]})).players[0];
 assert.equal(loaded.name,'Jarvis');assert.equal(loaded.skills.drive,83);
 assert.equal(loaded.appearance.top,'jersey');assert.equal(loaded.appearance.bottom,'shorts');
 assert.equal(loaded.appearance.shoes,player.appearance.accent);assert.equal(loaded.appearance.paddle,player.appearance.accent);
 assert.equal(loaded.appearance.skin,player.appearance.skin);
});
test('new clothing and equipment choices persist and reject unknown options',()=>{
 const player=newPlayer('outfit');Object.assign(player.appearance,{top:'tank',bottom:'skirt',accessory:'watch',shoes:'#b76564',paddle:'#315d58',hat:'backwards'});
 let saved='';savePlayer({setItem:(_key,value)=>{saved=value}},parseLibrary(null),player,true);
 assert.deepEqual(parseLibrary(saved).players[0],player);
 assert.throws(()=>validatePlayer({...player,appearance:{...player.appearance,bottom:'invalid'}}));
});

test('hat color saves independently and older hats retain their original color',()=>{
 const player=newPlayer('hat-color');player.appearance.hatColor='#ac7bd8';
 let saved='';savePlayer({setItem:(_key,value)=>{saved=value}},parseLibrary(null),player);
 const loaded=parseLibrary(saved).players[0];assert.equal(loaded.appearance.hatColor,'#ac7bd8');assert.equal(loaded.appearance.accent,player.appearance.accent);
 const legacy=JSON.parse(JSON.stringify(player));delete legacy.appearance.hatColor;
 assert.equal(validatePlayer(legacy).appearance.hatColor,player.appearance.accent);
 legacy.appearance.hat='visor';assert.equal(validatePlayer(legacy).appearance.hatColor,player.appearance.jersey);
 assert.throws(()=>validatePlayer({...player,appearance:{...player.appearance,hatColor:'invalid'}}));
});


test('deleting players preserves other profiles, clears only the deleted active selection, and is atomic',()=>{
 const a=newPlayer('a'),b=newPlayer('b');const library={version:1 as const,activeId:'a',players:[a,b]};let saved='';
 const storage={setItem:(_key:string,value:string)=>{saved=value}};
 const withoutB=deletePlayer(storage,library,'b');assert.equal(withoutB.activeId,'a');assert.deepEqual(withoutB.players,[a]);
 const withoutA=deletePlayer(storage,library,'a');assert.equal(withoutA.activeId,null);assert.deepEqual(withoutA.players,[b]);assert.deepEqual(parseLibrary(saved),withoutA);
 assert.throws(()=>deletePlayer({setItem:()=>{throw new Error('quota')}},library,'a'));assert.deepEqual(library.players,[a,b]);assert.equal(library.activeId,'a');
 const empty=deletePlayer(storage,withoutA,'b');assert.deepEqual(empty,{version:1,activeId:null,players:[]});
});

test('player IDs work over LAN HTTP without crypto.randomUUID',()=>{
 const httpCrypto={getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)};
 const ids=Array.from({length:100},()=>playerId(httpCrypto));
 assert.equal(new Set(ids).size,100);
 for(const id of ids){assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.equal(validatePlayer(newPlayer(id)).id,id);}
});

test('custom catchphrases survive saving and older players remain compatible',()=>{
 let stored='';const player=newPlayer('phrase');player.catchphrase='  Make each shot count  ';
 savePlayer({setItem:(_key,value)=>{stored=value}},parseLibrary(null),player);
 assert.equal(parseLibrary(stored).players[0].catchphrase,'Make each shot count');
 assert.equal(validatePlayer(newPlayer('older')).catchphrase,undefined);
 assert.equal(validatePlayer({...player,catchphrase:'x'.repeat(20)}).catchphrase,'x'.repeat(20));
 const legacy=JSON.parse(stored);legacy.players[0].catchphrase='An older longer catchphrase';
 assert.equal(parseLibrary(JSON.stringify(legacy)).players[0].catchphrase,'An older longer catchphrase');
 assert.throws(()=>validatePlayer({...player,catchphrase:'x'.repeat(21)}));
 assert.throws(()=>validatePlayer({...player,catchphrase:42}));
});
