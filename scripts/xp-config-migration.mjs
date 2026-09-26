/** After tuning src/xp-config.json, emit a NEW migration; never rewrite applied migrations. */
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../src/xp-config.json',import.meta.url),'utf8'));
if(!Number.isInteger(config.XP_PER_SKILL_POINT)||config.XP_PER_SKILL_POINT<=0||config.MAX_SKILL_BUDGET<config.STARTING_SKILL_BUDGET||config.MAX_SKILL_BUDGET>50)throw Error('Invalid XP configuration');
console.log(`-- Generated from src/xp-config.json\nupdate public.xp_config set config='${JSON.stringify(config).replaceAll("'","''")}'::jsonb where id=true;\nnotify pgrst,'reload schema';`);
