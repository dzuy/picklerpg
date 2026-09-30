import {AvatarThumbnails} from './avatar-preview';
import {preloadAthletes} from './athlete';
import {DEFAULT_APPEARANCE,type Appearance} from './player-design';
import {applyFunTheme,FUN_THEMES} from './fun-themes';
import {COURT_LOCATIONS} from './locations';
import {COURT_PACK_LOCATIONS,type PackId} from './pack-catalog';

type Preview={label:string;image?:string;appearance?:Appearance;category?:string;colors?:readonly string[]};
const style:Preview[]=[
 {label:'Twin buns',appearance:{...DEFAULT_APPEARANCE,hat:'none',hairStyle:'twin-buns',hair:'#804a73'},category:'hairStyle'},
 {label:'Cowboy Hat',appearance:{...DEFAULT_APPEARANCE,hat:'cowboy',hatColor:'#c98e65'},category:'hat'},
 {label:'Star sunglasses',appearance:{...DEFAULT_APPEARANCE,hat:'none',glasses:'stars',glassesColor:'#ff70a6'},category:'glasses'},
 {label:'Bear outfit',appearance:{...DEFAULT_APPEARANCE,hat:'none',outfit:'bear',outfitColor:'#754732'},category:'outfit'},
];
const courts:Preview[]=COURT_PACK_LOCATIONS.filter(id=>id!=='winter').map(id=>{const court=COURT_LOCATIONS.find(c=>c.id===id)!;return {label:court.name,image:court.image};});
const fun:Preview[]=FUN_THEMES.map(theme=>({label:theme.name,appearance:applyFunTheme({...DEFAULT_APPEARANCE,hat:'none'},theme.id),category:'roster',colors:theme.colors}));
let portraits:AvatarThumbnails|undefined;
let ready:Promise<void>|undefined;

/** Store samples show actual included models, independently of ownership. */
export function storePackPreview(id:PackId){
 const grid=document.createElement('div');grid.className='store-pack-previews';grid.dataset.pack=id;
 grid.setAttribute('aria-label',`${id==='everything'?'All three packs':id==='style'?'Style':id==='court'?'Court':'Fun'} preview`);
 const samples=id==='style'?style:id==='court'?courts:id==='fun'?fun:[{...style[2],label:'Style'}, {...courts[0],label:'Courts'}, {...fun[0],label:'Fun'}];
 for(const sample of samples){
  const tile=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
  tile.className='store-preview-tile';caption.textContent=sample.label;image.alt='';image.width=256;image.height=256;image.decoding='async';
  if(sample.colors)tile.style.setProperty('--preview-background',`linear-gradient(145deg,${sample.colors[0]},${sample.colors[1]})`);
  if(sample.image){image.src=sample.image;tile.classList.add('store-preview-court');}
  else if(sample.appearance){
   ready??=preloadAthletes();
   void ready.then(()=>{if(!image.isConnected)return;portraits??=new AvatarThumbnails(256);image.src=portraits.get(sample.appearance!,sample.category!);}).catch(()=>{image.hidden=true;});
  }
  tile.append(image,caption);grid.append(tile);
 }
 return grid;
}
