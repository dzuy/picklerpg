import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateNetExecution,evaluateHandsReception} from '../src/net-skill-evaluation';

test('counter and volley skills improve placement across matched contact conditions',()=>{
 for(const attribute of ['counter','volley'] as const){
  const low=evaluateNetExecution(attribute,50,500),high=evaluateNetExecution(attribute,90,500);
  for(let i=0;i<low.length;i++){
   assert.ok(high[i].inCourtRate>low[i].inCourtRate,`${attribute} ${low[i].type} ${low[i].condition}`);
   assert.ok(high[i].meanError<low[i].meanError*.5);
  }
 }
});

test('hands improve pressured execution and fixed incoming-ball reception',()=>{
 const low=evaluateNetExecution('hands',50,500),high=evaluateNetExecution('hands',90,500);
 const rushed=low.findIndex(r=>r.condition==='rushed');
 assert.ok(high[rushed].mishitRate<low[rushed].mishitRate*.6);
 assert.ok(high[rushed].meanError<low[rushed].meanError);
 const a=evaluateHandsReception(50,500),b=evaluateHandsReception(90,500);
 for(let i=0;i<a.length;i++){assert.ok(b[i].returnRate>=a[i].returnRate);assert.ok(b[i].pressure<=a[i].pressure)}
 assert.ok(b[1].returnRate>a[1].returnRate+.15);
});

test('flick accuracy plateaus at the fixed hands ceiling while volley accuracy keeps improving',()=>{
 const mid=evaluateNetExecution('volley',70,200),high=evaluateNetExecution('volley',90,200);
 for(let i=0;i<mid.length;i++){
  if(mid[i].type==='flick'){
   assert.equal(mid[i].meanError,high[i].meanError);
   assert.equal(mid[i].inCourtRate,high[i].inCourtRate);
  }else assert.ok(high[i].meanError<mid[i].meanError);
 }
});
