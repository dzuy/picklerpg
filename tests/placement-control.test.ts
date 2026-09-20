import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {executeShot} from '../src/engine/execution';
test('tight placement increases actual dispersion, preserves skill advantage and is symmetric',()=>{
 const m=new Match(),c=m.shotAssessmentContexts[0];
 const context={...c.context,opening:'rally' as const,bounced:true,twoBounceSatisfied:true,contact:{x:1,y:.7,z:3},feet:{x:1,y:0,z:3},incomingSpeed:5};
 const intent={...m.targetingMenu[0].intent,type:'lob' as const,pace:'soft' as const,shape:'arc' as const,spin:{side:'none' as const,vertical:'none' as const,strength:'medium' as const},intendedNetClearance:.25};
 const players=(skill:number)=>c.players.map(p=>({...p,skills:Object.fromEntries(Object.keys(p.skills).map(k=>[k,skill])) as typeof p.skills}));
 const run=(x:number,z:number,skill:number)=>executeShot({...intent,target:{kind:'point',x,z}},context,players(skill),{seed:123,balance:1});
 const deep=run(0,-4,90),short=run(2.85,-.4,90),weak=run(2.85,-.4,40);
 assert.ok(short.dispersion>deep.dispersion);assert.ok(short.endpointError>deep.endpointError);assert.ok(weak.dispersion>short.dispersion);
 assert.ok(short.difficulty.includes('Short lob depth control'));
 assert.equal(run(-2.85,-.4,90).dispersion,short.dispersion);
});
