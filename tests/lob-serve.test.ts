import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../src/match';
import {parseLocalCommand,commandIntent,canParseInstantly} from '../src/engine/custom-command';
import {preparedContact} from './helpers/prepared-shot';
import {generateTrajectory} from '../src/engine/trajectory';
test('lob serve is a serve with diagonal target and visibly higher arc',()=>{const m=new Match(),c=preparedContact('serve').context;const parse=(text:string)=>commandIntent(parseLocalCommand(text),'you',c,m.state.players).intent;const normal=generateTrajectory(parse('serve'),c,m.state.players),lob=generateTrajectory(parse('lob serve'),c,m.state.players);assert.equal(lob.intent.type,'serve');assert.equal(lob.intent.target.kind,'zone');assert.ok(lob.aimPoint.x*c.contact.x<0);assert.ok(lob.apex>normal.apex+1);assert.ok(lob.netClearance>=2.5-1e-8);assert.ok(canParseInstantly('high lob serve'));});
test('lob serve immediately plays at serve contact without model call',async()=>{const m=new Match();await m.submitCommand('lob serve');assert.equal(m.state.phase,'flight',m.customStatus);assert.equal(m.shot.intent.type,'serve');assert.equal(m.shot.intent.intendedNetClearance,2.5);});
test('lob serve remains unavailable mid-rally and plain lob remains a lob',async()=>{assert.equal(parseLocalCommand('lob left').shot,'lob');const m=new Match();m.startPractice('wide');await m.submitCommand('lob serve');assert.equal(m.state.phase,'decision');assert.equal(m.customPreview,null)});
