import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('CLI accepts an explicit opening team independently from its point cap',()=>{
 const out=mkdtempSync(join(tmpdir(),'pickle-eval-cli-'));
 const run=spawnSync(process.execPath,['--import','tsx','scripts/evaluate-games.ts','--scenario','equal-70','--seeds','1','--rotation','0','--opening-team','away','--max-steps','1','--max-points','9','--out',out],{encoding:'utf8'});
 assert.equal(run.status,2,run.stderr);
 const manifest=JSON.parse(readFileSync(join(out,'manifest.json'),'utf8'));assert.equal(manifest.maxPoints,9);assert.deepEqual(manifest.openings,['away']);
 const game=JSON.parse(readFileSync(join(out,'games.jsonl'),'utf8'));assert.equal(game.openingTeam,'away');assert.equal(game.steps,1);
});
