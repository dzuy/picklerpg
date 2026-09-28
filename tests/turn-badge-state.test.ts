import test from 'node:test';
import assert from 'node:assert/strict';
import {TurnBadgeState} from '../src/turn-badge-state';
test('badge updates to the authoritative count and clears at zero or logout',async()=>{
 let count=3;const seen:number[]=[];const state=new TurnBadgeState(async()=>count,n=>seen.push(n));
 state.identify('player');await state.refresh();assert.equal(state.count,3);
 count=2;await state.refresh();assert.equal(state.count,2);
 count=0;await state.refresh();assert.equal(state.count,0);
 count=4;await state.refresh();state.identify(null);assert.equal(state.count,0);assert.deepEqual(seen,[0,3,2,0,4,0]);
});
test('old account and out-of-order responses cannot restore stale badges',async()=>{
 const pending:((n:number)=>void)[]=[];const state=new TurnBadgeState(()=>new Promise(resolve=>pending.push(resolve)),()=>{});
 state.identify('a');const old=state.refresh();state.identify('b');const fresh=state.refresh();pending[1](1);await fresh;pending[0](9);await old;assert.equal(state.count,1);
 const first=state.refresh(),last=state.refresh();pending[3](0);await last;pending[2](5);await first;assert.equal(state.count,0);
});
test('offline and invalid results preserve the last confirmed count',async()=>{
 let value=2;const state=new TurnBadgeState(async()=>{if(value===-1)throw Error('Offline');return value;},()=>{});state.identify('a');await state.refresh();value=-1;await state.refresh();assert.equal(state.count,2);value=NaN;await state.refresh();assert.equal(state.count,2);
});
