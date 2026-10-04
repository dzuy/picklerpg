import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
// @ts-ignore standalone release check
import {migrationCollisions} from '../scripts/check-migrations.mjs';
test('migration checker rejects duplicates and release filenames have unique versions',()=>{
 assert.deepEqual(migrationCollisions(['202610020001_a.sql','202610020002_b.sql']),[]);
 assert.deepEqual(migrationCollisions(['1_a.sql','1_b.sql']),[['1',['1_a.sql','1_b.sql']]]);
 assert.deepEqual(migrationCollisions(readdirSync('supabase/migrations').sort()),[]);
});
