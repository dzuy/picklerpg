import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStyleStore,updateTokenCss} from '../scripts/design-style-store';
import {validatePalette} from '../src/design-system/styles';
const seed=JSON.parse(await readFile(new URL('../art/design-system/styles.json',import.meta.url),'utf8'));
const css=await readFile(new URL('../src/design-system/tokens.css',import.meta.url),'utf8');
async function fixture(){const root=await mkdtemp(join(tmpdir(),'picklebash-styles-'));for(const dir of ['art/design-system','src/design-system','public'])await mkdir(join(root,dir),{recursive:true});await writeFile(join(root,'art/design-system/styles.json'),JSON.stringify(seed));await writeFile(join(root,'src/design-system/tokens.css'),css);await writeFile(join(root,'index.html'),'<meta name="theme-color" content="#fff9ef"/>');await writeFile(join(root,'public/manifest.webmanifest'),JSON.stringify({theme_color:'#fff9ef',background_color:'#fff9ef'}));return root}
test('named palettes survive reopening; saving does not change app tokens; applying keeps exact bright colors',async()=>{
 const root=await fixture();try{const store=createStyleStore(root),colors={...seed.styles[0].colors,primary:'#ff2e77',cream:'#eff8fb'};
 const saved=await store.mutate({action:'save',name:'Bright Pink',colors});assert.equal(saved.style.colors.primary,'#ff2e77');assert.equal(await readFile(join(root,'src/design-system/tokens.css'),'utf8'),css);
 const reopened=createStyleStore(root);assert.equal((await reopened.read()).styles.find(s=>s.id===saved.style.id)?.name,'Bright Pink');
 await reopened.mutate({action:'apply',id:saved.style.id});const applied=await readFile(join(root,'src/design-system/tokens.css'),'utf8');assert.match(applied,/--pb-primary: #ff2e77;/);assert.match(applied,/--pb-on-primary: var\(--pb-white\)/);assert.equal((await reopened.read()).activeId,saved.style.id);assert.match(await readFile(join(root,'index.html'),'utf8'),/#eff8fb/);assert.equal(JSON.parse(await readFile(join(root,'public/manifest.webmanifest'),'utf8')).background_color,'#eff8fb');
 const changed=await reopened.mutate({action:'save',id:saved.style.id,name:'Pink Final',colors:{...colors,primary:'#ff0088'}});assert.equal(changed.style.id,saved.style.id);assert.equal(changed.library.activeId,null);assert.match(await readFile(join(root,'src/design-system/tokens.css'),'utf8'),/--pb-primary: #ff2e77;/);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('invalid, duplicate, and concurrent saves cannot overwrite other styles',async()=>{
 const root=await fixture();try{const store=createStyleStore(root);const colors=seed.styles[0].colors;
 await assert.rejects(store.mutate({action:'save',name:'Original Daylight',colors}),/already used/);
 await assert.rejects(store.mutate({action:'save',name:'Broken',colors:{...colors,primary:'red;body{display:none}'}}),/Invalid color/);
 await assert.rejects(store.mutate({action:'save',id:'missing',name:'Missing',colors}),/no longer exists/);
 await Promise.all(['One','Two'].map(name=>store.mutate({action:'save',name,colors})));
 assert.equal((await store.read()).styles.length,seed.styles.length+2);
 await assert.rejects(store.mutate({action:'apply',id:'missing'}),/Choose a saved style/);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('palettes require all editable tokens and reject CSS injection or unknown keys',()=>{
 assert.throws(()=>validatePalette({primary:'#ff0088'}));assert.throws(()=>validatePalette({...seed.styles[0].colors,evil:'#000000'}));
 assert.throws(()=>updateTokenCss(':root {}',seed.styles[0].colors),/Missing theme token/);
});
