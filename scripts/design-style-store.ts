import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EDITABLE_COLORS,validateLibrary,validatePalette,validateStyleName,type StyleLibrary} from '../src/design-system/styles';

async function atomicWrite(file:string,text:string){
 await mkdir(dirname(file),{recursive:true});const temp=`${file}.${randomUUID()}.tmp`;
 try{await writeFile(temp,text,'utf8');await rename(temp,file)}finally{await rm(temp,{force:true})}
}
export function updateTokenCss(css:string,colors:unknown):string{
 const palette=validatePalette(colors);
 for(const key of EDITABLE_COLORS){const pattern=new RegExp(`(--pb-${key}:\\s*)[^;]+;`);if(!pattern.test(css))throw new Error(`Missing theme token: ${key}`);css=css.replace(pattern,`$1${palette[key]};`)}
 return css.replace(' /* Pink deepened for readable white labels. */','');
}
export function createStyleStore(root:string){
 const file=join(root,'art/design-system/styles.json');let queue:Promise<unknown>=Promise.resolve();
 const read=async()=>validateLibrary(JSON.parse(await readFile(file,'utf8')));
 const persist=(library:StyleLibrary)=>atomicWrite(file,JSON.stringify(library,null,2)+'\n');
 async function mutate(request:Record<string,unknown>){
  const library=await read();
  if(request.action==='save'){
   const name=validateStyleName(request.name),colors=validatePalette(request.colors);
   const existing=request.id===undefined?undefined:library.styles.find(style=>style.id===request.id);
   if(request.id!==undefined&&!existing)throw new Error('That saved style no longer exists. Reload the library.');
   if(library.styles.some(style=>style.id!==existing?.id&&style.name.toLowerCase()===name.toLowerCase()))throw new Error('That name is already used. Choose another name or update its saved style.');
   if(!existing&&library.styles.length>=100)throw new Error('The style library is full.');
   const style={id:existing?.id??randomUUID(),name,colors,updatedAt:new Date().toISOString()};
   if(existing){library.styles[library.styles.indexOf(existing)]=style;if(library.activeId===style.id)library.activeId=null;}
   else library.styles.push(style);
   await persist(library);return {library,style};
  }
  if(request.action==='apply'){
   const style=library.styles.find(style=>style.id===request.id);if(!style)throw new Error('Choose a saved style first.');
   const tokenFile=join(root,'src/design-system/tokens.css'),htmlFile=join(root,'index.html'),manifestFile=join(root,'public/manifest.webmanifest');
   const originals=await Promise.all([tokenFile,htmlFile,manifestFile].map(p=>readFile(p,'utf8')));
   const manifest=JSON.parse(originals[2]);manifest.theme_color=manifest.background_color=style.colors.cream;
   const updated=[updateTokenCss(originals[0],style.colors),originals[1].replace(/(<meta name="theme-color" content=")[^"]+("\/?>)/,`$1${style.colors.cream}$2`),JSON.stringify(manifest,null,2)+'\n'];
   // Read/validate every file first; restore originals if a subsequent write fails.
   const paths=[tokenFile,htmlFile,manifestFile];
   try{for(let i=0;i<paths.length;i++)if(updated[i]!==originals[i])await atomicWrite(paths[i],updated[i]);library.activeId=style.id;await persist(library)}
   catch(error){for(let i=0;i<paths.length;i++)await atomicWrite(paths[i],originals[i]);throw error}
   return {library,style};
  }
  throw new Error('Unknown style action.');
 }
 return {read:()=>queue.then(read),mutate(request:Record<string,unknown>){const result=queue.then(()=>mutate(request));queue=result.catch(()=>{});return result}};
}
