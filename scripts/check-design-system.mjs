import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync('src/design-system/tokens.css','utf8');
const tokens=new Map([...source.matchAll(/(--pb-[\w-]+):\s*([^;]+);/g)].map(([,key,value])=>[key,value.trim()]));
const resolve=(key,seen=new Set())=>{assert(!seen.has(key),`Circular token: ${key}`);seen.add(key);const value=tokens.get(key);assert(value,`Missing token: ${key}`);return value.replace(/var\((--pb-[\w-]+)\)/g,(_,ref)=>resolve(ref,new Set(seen)))};
for(const key of tokens.keys())resolve(key);
const cssFiles=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?cssFiles(`${dir}/${entry.name}`):entry.name.endsWith('.css')?[`${dir}/${entry.name}`]:[]);
for(const file of cssFiles('src'))for(const [,key] of readFileSync(file,'utf8').matchAll(/var\((--pb-[\w-]+)/g))assert(tokens.has(key),`${file}: unknown ${key}`);
const luminance=hex=>{assert(/^#[a-f\d]{6}$/i.test(hex),`Expected opaque hex, got ${hex}`);const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
const pairs=[['text','bg'],['text','surface'],['text','tint-lime'],['text-secondary','surface'],['text-muted','surface'],['on-primary','primary'],['on-primary','primary-hover'],['on-social','social'],['on-social','social-hover'],['info-ink','selected'],['social-ink','tint-pink'],['success-ink','tint-mint'],['warning-ink','warning'],['on-danger','danger']];
let contrastNotes=0;
for(const [fg,bg]of pairs){const a=luminance(resolve(`--pb-${fg}`)),b=luminance(resolve(`--pb-${bg}`)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(ratio<4.5){contrastNotes++;console.warn(`Contrast note: ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (normal-text target 4.5:1). Colors were not changed.`)}}
for(const fg of ['focus','border-strong']){const a=luminance(resolve(`--pb-${fg}`)),b=luminance(resolve('--pb-surface'));if((Math.max(a,b)+.05)/(Math.min(a,b)+.05)<3){contrastNotes++;console.warn(`Contrast note: ${fg} is below 3:1 against the control surface.`)}}
console.log(`Design system: ${tokens.size} tokens resolved; all CSS references valid; ${contrastNotes} contrast notes. Contrast is advisory for intentionally chosen palettes.`);
