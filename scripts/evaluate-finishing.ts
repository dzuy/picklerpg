import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {evaluateFinishing} from '../src/finishing-evaluation';
const out=resolve(process.argv[2]??'evaluation/finishing-controlled');mkdirSync(out,{recursive:true});
const rows=[50,70,90].flatMap(s=>evaluateFinishing(s));
writeFileSync(resolve(out,'results.json'),JSON.stringify(rows,null,2));
const pct=(n:number)=>(100*n).toFixed(1)+'%';
const lines=['# Controlled overhead finishing','','Same 200 seeds per case; only hitter overhead varies. Other attributes and defenders stay at 70. These are immediate shot outcomes, not eventual rally wins. Legal rate describes landing before interception; actual faults also include body-contact outcomes. Opposite-side cases sample both court directions, not exact geometric mirrors.','','| Skill | Actor | Contact | Target | Legal | Immediate win | Fault | Returned | Error (m) |','|---:|---|---|---|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.skill} | ${r.actor} | ${r.position} | ${r.aim} | ${pct(r.legalRate)} | ${pct(r.immediateWinRate)} | ${pct(r.faultRate)} | ${pct(r.returnedRate)} | ${r.meanError.toFixed(3)} |`)];
writeFileSync(resolve(out,'report.md'),lines.join('\n'));console.log(`Report: ${out}/report.md`);
