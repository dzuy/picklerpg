import test from 'node:test';
import assert from 'node:assert/strict';
import {RematchCountdown} from '../src/rematch-countdown';
function setup(){let time=0,active=true,sends=0;const values=new Map<string,string>(),seen:(number|null)[]=[];
 const timer=new RematchCountdown({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}},()=>active,()=>seen.push(timer.remaining),()=>sends++,()=>time);
 return {timer,seen,get sends(){return sends},at:(n:number)=>{time=n;timer.tick();},background:()=>{active=false;timer.tick();}};
}
test('uses elapsed time, shows 10 through 1, and expires without displaying zero',()=>{
 const s=setup();s.timer.start('game');for(let n=1;n<=10;n++)s.at(n*1000);
 assert.deepEqual(s.seen,[10,9,8,7,6,5,4,3,2,1,null]);assert.equal(s.sends,1);s.at(12000);assert.equal(s.sends,1);
});
test('delayed callbacks use the deadline rather than count ticks',()=>{const s=setup();s.timer.start('game');s.at(6400);assert.equal(s.timer.remaining,4);s.at(10300);assert.equal(s.sends,1);});
test('cancellation and backgrounding consume the only attempt',()=>{for(const background of [false,true]){const s=setup();s.timer.start('game');if(background)s.background();else s.timer.cancel();s.timer.start('game');s.at(12000);assert.equal(s.sends,0);assert.equal(s.timer.remaining,null);}});
test('a new match gets its own countdown',()=>{const s=setup();s.timer.start('old');s.timer.cancel();s.timer.start('new');assert.equal(s.timer.remaining,10);s.timer.cancel();});
