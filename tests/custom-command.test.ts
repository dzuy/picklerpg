import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canParseInstantly,parseLocalCommand,validateCommand} from '../src/engine/custom-command';
import {Match} from '../src/match';
test('pickleball language parses shot, target, aim, pace and spin',()=>{assert.deepEqual(parseLocalCommand('Body bag the right player with a hard drive'),{shot:'drive',target:'right',aim:'body',pace:'fast',spin:'none',spinDirection:'none',spinStrength:'medium'});assert.equal(parseLocalCommand('rip it middle').shot,'drive');assert.equal(parseLocalCommand('roll at her feet on the left').aim,'feet');assert.throws(()=>parseLocalCommand('dink behind him'));assert.throws(()=>validateCommand({shot:'lob',target:'middle',aim:'space',pace:'soft',score:11}));});
test('smash means a fast overhead into open court and plays from a high contact',async()=>{
 const parsed=parseLocalCommand('smash');assert.equal(canParseInstantly('smash'),true);
 assert.equal(parsed.shot,'overhead');assert.equal(parsed.pace,'fast');assert.equal(parsed.target,'open-court');
 const m=new Match();m.startPractice('height');await m.submitCommand('smash','voice');
 assert.equal(m.state.phase,'flight',m.customStatus);assert.equal(m.shot.intent.type,'overhead');
 assert.equal(m.shot.intent.pace,'fast');assert.equal(m.shot.intent.target.kind,'zone');
 if(m.shot.intent.target.kind==='zone')assert.equal(m.shot.intent.target.zone,'open-court');
 assert.equal(m.state.shotHistory.at(-1)?.source,'voice');
});
test('spin language separates curve direction from target and reads intensity',()=>{
 assert.deepEqual(parseLocalCommand('strong left spin drive to the middle'),{shot:'drive',target:'middle',aim:'space',pace:'medium',spin:'sidespin',spinDirection:'left',spinStrength:'strong'});
 assert.deepEqual(parseLocalCommand('gentle right slice serve wide'),{shot:'serve',target:'wide',aim:'space',pace:'medium',spin:'slice',spinDirection:'right',spinStrength:'light'});
 assert.deepEqual(parseLocalCommand('heavy topspin drive'),{shot:'drive',target:'middle',aim:'space',pace:'medium',spin:'topspin',spinDirection:'none',spinStrength:'strong'});
 assert.deepEqual(parseLocalCommand('strong spin'),{shot:'drive',target:'middle',aim:'space',pace:'medium',spin:'sidespin',spinDirection:'right',spinStrength:'strong'});
});
test('custom kitchen lob keeps its explicit target and commit alongside menu lobs',async()=>{const m=new Match();m.startPractice('wide');assert.ok(m.availableIntents.some(i=>i.type==='lob'));const before=m.snapshot();await m.previewCommand('lob the left player');assert.ok(m.customPreview,m.customStatus);assert.deepEqual(m.snapshot(),before);m.playCustom();assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.type,'lob');assert.equal(m.shot.intent.source,'text');for(let i=0;i<3000&&m.state.phase!=='complete';i++){if(m.state.phase==='decision'&&m.state.possession==='home')m.submitIntent(m.availableIntents[0]);m.update(.1)}assert.equal(m.state.phase,'complete')});
test('an intentional bounce can turn an airborne popup into a dink',async()=>{const m=new Match();m.startPractice('height');const before=m.snapshot();await m.submitCommand('let it bounce then dink');assert.equal(m.state.phase,'flight');assert.equal(m.shot.intent.type,'dink');assert.ok(m.shot.legs.length>=3);assert.equal(m.shot.legs[0].bounceAtEnd,true);for(let i=1;i<m.shot.legs.length;i++)assert.deepEqual(m.shot.legs[i].from,m.shot.legs[i-1].to);assert.deepEqual(m.shot.contact,before.ball.position);m.update(m.shot.legs[0].duration);assert.equal(m.state.bounces,before.bounces+1)});
test('impossible overhead is explained and cannot be played',async()=>{const m=new Match();m.startPractice('height');m.startPractice('height');await m.previewCommand('overhead middle');assert.equal(m.customPreview,null);assert.ok(m.customStatus);assert.throws(()=>m.playCustom())});
test('roll approximation and body target execute without overwriting current ball',async()=>{const m=new Match();m.startPractice('counter');await m.previewCommand('roll at right player feet');assert.ok(m.customPreview,m.customStatus);assert.match(m.customPreview!.note,/spin/);m.playCustom();m.reset();m.startPractice('counter');await m.previewCommand('jam right player body');assert.ok(m.customPreview,m.customStatus);m.playCustom();m.update(1)});
test('LLM parsing is validated and stale response cannot submit after reset',async()=>{const old=globalThis.fetch;let done!:(r:Response)=>void;globalThis.fetch=(()=>new Promise<Response>(r=>done=r)) as typeof fetch;try{const m=new Match();m.startPractice('wide');const p=m.previewCommand('a moonball over Rio',true);m.reset();done(new Response(JSON.stringify({shot:'lob',target:'rio',aim:'space',pace:'soft'})));await p;assert.equal(m.customPreview,null);assert.equal(m.state.phase,'decision')}finally{globalThis.fetch=old}});

test('a high drive automatically waits for one bounce, preserving target and voice source',async()=>{
 const m=new Match();m.startPractice('height');
 assert.ok(m.state.ball.position.y>1.7);
 const before=m.snapshot();await m.submitCommand('drive deep right','voice');
 assert.equal(m.state.phase,'flight',m.customStatus);assert.equal(m.shot.intent.type,'drive');assert.equal(m.shot.intent.source,'voice');
 assert.equal(m.shot.intent.target.kind,'zone');if(m.shot.intent.target.kind==='zone')assert.equal(m.shot.intent.target.depth,'deep');
 assert.equal(m.shot.legs[0].bounceAtEnd,true);assert.deepEqual(m.shot.contact,before.ball.position);
 assert.ok(m.shot.feedback?.difficulty.includes('Delayed drive'));
 const context={...m['currentContext']!,contact:m.shot.legs[1].to,bounced:true,allowRisky:true,incomingSpeed:Math.max(2,m['currentContext']!.incomingSpeed*.35)};
 const normal=m['plan'](m.shot.intent,'comparison',context,before.players,m['customIndex']);
 assert.ok(m.shot.feedback!.quality<normal.feedback!.quality,'Waiting reduces actual execution quality');
 for(let i=1;i<m.shot.legs.length;i++)assert.deepEqual(m.shot.legs[i-1].to,m.shot.legs[i].from);
 m.update(m.shot.legs[0].duration);assert.equal(m.state.bounces,before.bounces+1);
});
test('waiting for a high already-bounced drive does not add an illegal second bounce',async()=>{
 const m=new Match();m.startPractice('height');m['currentContext']!.bounced=true;
 await m.submitCommand('drive deep right');assert.equal(m.state.phase,'flight',m.customStatus);
 assert.notEqual(m.shot.legs[0].bounceAtEnd,true);assert.ok(m.shot.legs[0].to.y<m.shot.legs[0].from.y);
});
