import {readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function migrationCollisions(files){
 const versions=new Map();
 for(const file of files){if(!file.endsWith('.sql'))continue;const match=/^(\d+)_.+\.sql$/.exec(file);if(!match)throw Error(`Invalid migration filename: ${file}`);versions.set(match[1],[...(versions.get(match[1])??[]),file]);}
 return [...versions].filter(([,names])=>names.length>1);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const duplicates=migrationCollisions(await readdir(new URL('../supabase/migrations/',import.meta.url)));
 if(duplicates.length){
  console.error('Database deployment blocked: reconcile the existing migration ledger before renaming or applying these versions.');
  for(const [version,names] of duplicates)console.error(`${version}: ${names.join(', ')}`);
  process.exitCode=1;
 }else console.log('Migration filenames have unique versions.');
}
