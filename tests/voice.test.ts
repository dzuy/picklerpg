import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VoiceInput,voiceCommand,voiceContactReady,type Recognition} from '../src/voice';
import {canParseInstantly,parseLocalCommand} from '../src/engine/custom-command';
import {Match} from '../src/match';
class FakeRecognition implements Recognition {
 lang='';continuous=true;interimResults=false;onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;onstart:Recognition['onstart']=null;
 starts=0;aborts=0;start(){this.starts++;this.onstart?.()}abort(){this.aborts++}
 emit(text:string,isFinal=true){this.onresult?.({resultIndex:0,results:[{isFinal,0:{transcript:text}}]})}
}
test('voice emits one final result with its original contact; interim and duplicates never play',()=>{
 const recognition=new FakeRecognition(),heard:unknown[]=[],statuses:string[]=[];let contact=12;
 const voice=new VoiceInput(()=>recognition,()=>contact,(text,context)=>heard.push({text,context}),text=>statuses.push(text));
 voice.start();voice.start();assert.equal(recognition.starts,1);recognition.emit('drive',false);assert.equal(heard.length,0);contact=13;
 recognition.emit('drive middle');recognition.emit('drive middle');assert.deepEqual(heard,[{text:'drive middle',context:12}]);assert.equal(voice.active,false);assert.equal(recognition.aborts,1);assert.match(statuses.at(-1)!,/Hearing/);
});
test('cancelled sessions cannot submit late speech or interfere with a new session',()=>{
 const instances:FakeRecognition[]=[],heard:string[]=[];const voice=new VoiceInput(()=>{const r=new FakeRecognition();instances.push(r);return r},()=>0,text=>heard.push(text),()=>{});
 voice.start();voice.stop();voice.start();instances[0].emit('lob');instances[0].onend?.();assert.equal(voice.active,true);instances[1].emit('reset');assert.deepEqual(heard,['reset']);
});
test('permission failures and silence stop without an automatic microphone retry',()=>{
 const r=new FakeRecognition(),status:string[]=[];const voice=new VoiceInput(()=>r,()=>0,()=>assert.fail(),text=>status.push(text));
 voice.start();r.onerror?.({error:'not-allowed'});r.emit('drive');assert.equal(voice.active,false);assert.match(status.at(-1)!,/permission denied/);assert.equal(r.starts,1);
 voice.start();r.onend?.();assert.equal(voice.active,false);assert.equal(r.starts,2);
});
test('unsupported speech is harmless',()=>{const voice=new VoiceInput(undefined,()=>0,()=>assert.fail(),()=>{});voice.start();assert.equal(voice.supported,false);assert.equal(voice.active,false)});
test('roadmap commands resolve locally with an explicit pronoun target',()=>{
 for(const text of ['Drive middle.','Drop crosscourt.','Jam him.','Reset.','Hard drive at her right hip.','Pull him wide and keep it soft.']){
  const command=voiceCommand(text,'rio');assert.equal(command.kind,'shot');if(command.kind==='shot')assert.equal(canParseInstantly(command.text),true,text);
 }
 const jam=voiceCommand('Jam him.','rio');assert.equal(jam.kind,'shot');if(jam.kind==='shot')assert.equal(parseLocalCommand(jam.text).target,'rio');
});
test('partner calls and controls cannot accidentally become shots',()=>{
 assert.deepEqual(voiceCommand('Finn, target her backhand.','jules'),{kind:'partner',call:{kind:'backhand',target:'jules'}});
 assert.deepEqual(voiceCommand('Crash when I drive.','rio'),{kind:'partner',call:{kind:'crash'}});
 assert.deepEqual(voiceCommand('Stop speeding up at him.','rio'),{kind:'partner',call:{kind:'soft',target:'rio'}});
 assert.deepEqual(voiceCommand('Next point.','rio'),{kind:'control',action:'next'});
 assert.throws(()=>voiceCommand('Finn, do something else','rio'),/Try/);
});
test('spoken intent shares local validation, tracks voice source, and never substitutes illegal contacts',async()=>{
 const old=fetch;globalThis.fetch=async()=>{throw new Error('Simple voice commands must stay local')};
 try{const m=new Match();m.startPractice('wide');await m.submitCommand('drive middle','voice');assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.source,'voice');
 const invalid=new Match();await invalid.submitCommand('overhead middle','voice');assert.equal(invalid.state.phase,'decision');assert.equal(invalid.state.shotHistory.length,0);assert.ok(invalid.customStatus)}finally{globalThis.fetch=old}
});
test('partner instructions persist across points and clear explicitly without enabling autonomy',()=>{
 const m=new Match();m.instructPartner({kind:'backhand',target:'rio'});m.instructPartner({kind:'crash'});m.instructPartner({kind:'soft',target:'jules'});m.reset();
 assert.deepEqual(m.partnerInstructions,{backhand:'rio',crash:true,soft:'jules'});assert.equal(m.partnerAutonomy,false);m.instructPartner({kind:'clear'});assert.deepEqual(m.partnerInstructions,{});
});
test('Finn recommends soft shots and the requested backhand without removing manual choices',()=>{
 const m=new Match();m.startPractice('wide');
 const c={contact:{x:1,y:1.1,z:3},feet:{x:1,y:0,z:3.3},bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:8};
 const baseline=m['options']('partner',c,m.state.players,4);
 m.instructPartner({kind:'soft',target:'rio'});m.instructPartner({kind:'backhand',target:'rio'});
 const options=m['options']('partner',c,m.state.players,4);
 assert.ok(options.length);assert.ok(['dink','drop','reset','block'].includes(options[0].intent.type));assert.match(options[0].description,/backhand instruction/);
 for(const choice of baseline)assert.ok(options.some(o=>o.intent.type===choice.intent.type),'Every manual shot family remains available');
 m.instructPartner({kind:'clear'});m.instructPartner({kind:'backhand',target:'rio'});
 const attacking=m['options']('partner',{...c,contact:{x:1,y:1.7,z:3},bounced:false},m.state.players,4);
 assert.deepEqual(attacking[0].intent.target,{kind:'player',playerId:'opponent-right',aim:'backhand-side'});
});
test('crash call changes Finn movement after a drive within the same movement budget',()=>{
 const m=new Match(),players=structuredClone(m.state.players);for(const p of players.filter(p=>p.team==='home'))p.position.z=6;
 const c={contact:{x:1.5,y:.8,z:6},feet:{x:1.5,y:0,z:6.2},bounced:true,opening:'rally' as const,twoBounceSatisfied:true,incomingSpeed:8};
 const intent={...m.availableIntents[0],type:'drive' as const,target:{kind:'zone' as const,zone:'middle' as const,depth:'deep' as const}};
 const baseline=m['plan'](intent,'test',c,players,3);m.instructPartner({kind:'crash'});const crash=m['plan'](intent,'test',c,players,3);
 assert.ok(crash.positions.partner.z<baseline.positions.partner.z);
 const p=players.find(p=>p.id==='partner')!,duration=crash.legs.reduce((sum,l)=>sum+l.duration,0);
 assert.ok(Math.hypot(crash.positions.partner.x-p.position.x,crash.positions.partner.z-p.position.z)<=(1.8+p.skills.movement/100*2)*duration+1e-9);
});

test('hands-free waits for team contacts but always offers next-point listening',()=>{
 assert.equal(voiceContactReady({phase:'decision',possession:'home',currentHitter:'you'},true),true);
 assert.equal(voiceContactReady({phase:'decision',possession:'home',currentHitter:'partner'},true),false);
 assert.equal(voiceContactReady({phase:'decision',possession:'home',currentHitter:'partner'},false),true);
 assert.equal(voiceContactReady({phase:'decision',possession:'away',currentHitter:'opponent-left'},false),false);
 assert.equal(voiceContactReady({phase:'flight',possession:'home',currentHitter:'you'},false),false);
 assert.equal(voiceContactReady({phase:'complete',possession:'home',currentHitter:'partner'},true),true);
});
test('speech service network failure survives end events and stops without retrying',()=>{
 const r=new FakeRecognition(),status:string[]=[];const voice=new VoiceInput(()=>r,()=>0,()=>assert.fail(),text=>status.push(text));
 voice.start();r.onerror?.({error:'network'});r.onend?.();
 assert.equal(voice.active,false);assert.equal(voice.failure,'network');assert.equal(r.starts,1);
 assert.match(status.at(-1)!,/speech recognition service/);assert.doesNotMatch(status.at(-1)!,/permission denied/);
 voice.start();assert.equal(voice.failure,null);assert.equal(voice.active,true);voice.stop();
});
test('blocked speech service is distinct from denied microphone permission',()=>{
 const r=new FakeRecognition(),status:string[]=[];const voice=new VoiceInput(()=>r,()=>0,()=>assert.fail(),text=>status.push(text));
 voice.start();r.onerror?.({error:'service-not-allowed'});assert.match(status.at(-1)!,/blocked its speech recognition service/);assert.equal(voice.failure,'service-not-allowed');
});
test('flat serve and narrowly matched speech mistakes use local intent with flat shape',async()=>{
 const old=fetch;globalThis.fetch=async()=>{throw new Error('Flat serve should never call the LLM')};
 try{
  for(const text of ['serve flat','Sir flat.','surf flat']){
   const command=voiceCommand(text,'jules');assert.equal(command.kind,'shot');if(command.kind!=='shot')continue;
   assert.equal(command.text,'serve flat');assert.equal(canParseInstantly(command.text),true);
   const m=new Match();await m.submitCommand(command.text,'voice');assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.type,'serve');assert.equal(m.shot.intent.shape,'flat');assert.equal(m.shot.intent.source,'voice');
  }
  assert.deepEqual(voiceCommand('sir can you hear me','jules'),{kind:'shot',text:'sir can you hear me'});
 }finally{globalThis.fetch=old}
});
test('local model progress updates retain the same cancellable voice session',()=>{
 const r=new FakeRecognition() as FakeRecognition & {onstatus?:(message:string)=>void},status:string[]=[];
 const voice=new VoiceInput(()=>r,()=>0,()=>assert.fail(),text=>status.push(text));voice.start();r.onstatus?.('Loading local voice model');assert.equal(voice.active,true);assert.equal(status.at(-1),'Loading local voice model');voice.stop();r.onstatus?.('Late update');assert.notEqual(status.at(-1),'Late update');
});
test('a second mic action finishes recognition without cancelling its final transcript',()=>{
 const r=new FakeRecognition() as FakeRecognition & {stop:()=>void};let finishes=0;r.stop=()=>{finishes++};const heard:string[]=[];
 const voice=new VoiceInput(()=>r,()=>0,text=>heard.push(text),()=>{});voice.start();assert.equal(voice.phase,'listening');voice.finish();assert.equal(voice.phase,'transcribing');assert.equal(finishes,1);assert.equal(r.aborts,0);r.emit('serve flat');assert.deepEqual(heard,['serve flat']);assert.equal(voice.phase,'idle');assert.equal(r.aborts,1);
});

 test('ordinary serve descriptions execute locally without a command service',async()=>{
  const original=fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('Unexpected command service request')};
  try{
   for(const phrase of ['Regular serve.','normal serve','standard serve','basic serve','plain serve','default serve','a regular serve please']){
    const command=voiceCommand(phrase,'jules');assert.equal(command.kind,'shot');if(command.kind!=='shot')continue;
    assert.equal(canParseInstantly(command.text),true,phrase);
    const match=new Match();await match.submitCommand(command.text,'voice');
    assert.equal(match.state.phase,'flight',phrase);assert.equal(match.shot.intent.type,'serve');assert.equal(match.shot.intent.source,'voice');assert.equal(match.shot.intent.pace,'medium');
   }
   assert.equal(requests,0);
   for(const phrase of ['not a regular serve','regular serve or lob','regular serve with unpredictable placement'])assert.equal(canParseInstantly(phrase),false);
  }finally{globalThis.fetch=original}
 });

test('partial transcripts update the input callback but never play and ignore cancelled sessions',()=>{
 const r=new FakeRecognition(),partial:unknown[]=[],played:string[]=[];
 const voice=new VoiceInput(()=>r,()=>42,text=>played.push(text),()=>{},()=>{},(text,context)=>partial.push({text,context}));
 voice.start();r.emit('regular',false);assert.deepEqual(partial,[{text:'regular',context:42}]);assert.deepEqual(played,[]);
 r.emit('regular serve');assert.deepEqual(played,['regular serve']);r.emit('late',false);assert.equal(partial.length,1);
 voice.start();voice.stop();r.emit('cancelled',false);assert.equal(partial.length,1);
});
