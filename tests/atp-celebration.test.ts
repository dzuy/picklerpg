import test from 'node:test';
import assert from 'node:assert/strict';
import {atpWinner} from '../src/atp-celebration';
import {PreparedShotFixture} from './helpers/prepared-shot';
test('celebration belongs only to the team winning directly from an unreturned ATP',()=>{
 const fixture=new PreparedShotFixture(),players=fixture.state.players,intent={...fixture.shot.intent,technique:'atp' as const,actor:'you' as const};
 assert.equal(atpWinner(intent,{winner:'home',reason:'double-bounce'},players),'home');
 assert.equal(atpWinner({...intent,actor:'opponent-left'},{winner:'away',reason:'missed-swing'},players),'away');
 assert.equal(atpWinner(intent,{winner:'away',reason:'out'},players),null);
 assert.equal(atpWinner(intent,{winner:'home',reason:'net'},players),null);
 assert.equal(atpWinner({...intent,technique:undefined},{winner:'home',reason:'winner'},players),null);
 assert.equal(atpWinner(intent,null,players),null);
});
