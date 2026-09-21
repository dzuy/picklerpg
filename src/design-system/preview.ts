import '../page-theme.css';
import './preview.css';
import {hudButtonIcon} from '../hud-button';
import {EDITABLE_COLORS,validatePalette,validateLibrary,type ThemePalette,type StyleLibrary} from './styles';

const editable=EDITABLE_COLORS;
const host=document.querySelector<HTMLElement>('#design-preview')!;
host.innerHTML=`<header><img src="/assets/picklebash-select/brand/picklebash-logo.png" alt="PickleBash"><div><p class="eyebrow">INTERNAL DESIGN PREVIEW</p><h1>Fresh court. Clear controls.</h1><p>Create a few styles, save your favorites, and choose one to use in the app.</p></div></header>
<div class="preview-layout"><aside class="pb-card"><h2>Your styles</h2><label class="style-field" for="saved-style">Saved style<select class="pb-input" id="saved-style" disabled></select></label><label class="style-field" for="style-name">Style name<input class="pb-input" id="style-name" maxlength="60" placeholder="e.g. Hot Pink"></label><div class="style-actions"><button class="pb-button pb-button--primary" id="save-new-style" disabled>Save as new style</button><button class="pb-button" id="update-style" disabled>Update saved style</button><button class="pb-button" id="apply-style" disabled>Use in app</button></div><p id="style-status" role="status" aria-live="polite">Loading saved styles…</p><p class="style-help">Save keeps a named palette in this project. Use in app applies the saved style to the game.</p><h2 class="palette-heading">Palette</h2><div id="palette-fields"></div><button class="pb-button" id="reset-theme">Revert to saved style</button><button class="pb-button" id="export-theme">Show CSS changes</button><textarea class="pb-input" id="theme-export" aria-label="Theme CSS changes" readonly hidden></textarea></aside>
<section class="preview-content"><div class="pb-card"><h2>Actions & states</h2><div class="preview-row"><button class="pb-button pb-button--primary">Play now ↗</button><button class="pb-button pb-button--social">Invite friends</button><button class="pb-button">View stats</button><button class="pb-button pb-button--danger">Delete</button><button class="pb-button" disabled>Unavailable</button></div><p>Tab through controls to inspect keyboard focus.</p><div class="preview-row"><label>Player name <input class="pb-input" placeholder="Your name"></label><label>Mode <select class="pb-input"><option>Casual play</option><option>Competitive</option></select></label></div><div class="preview-row"><span class="pb-tag">Your turn</span><span class="pb-tag pb-tag--social">Invitation</span><span class="pb-tag pb-tag--success">Connected</span><span class="preview-warning">Waiting for player</span></div><div class="preview-row preview-icons">${(['settings','replay','reactions','close'] as const).map(kind=>`<button class="preview-icon" aria-label="${kind}">${hudButtonIcon(kind)}</button>`).join('')}</div></div>
<div class="pb-card"><div class="preview-app-heading"><div><h2>Real app preview</h2><p>Navigate normally; palette edits apply to this frame.</p></div><label>Viewport <select class="pb-input" id="preview-size"><option value="390px">Phone · 390 px</option><option value="100%">Available width</option></select></label></div><div class="preview-frame-wrap"><iframe title="PickleBash app preview" src="/" id="live-app"></iframe></div></div></section></div>`;
const frame=document.querySelector<HTMLIFrameElement>('#live-app')!;
const overrides=new Map<string,string>();
const observedFrames=new WeakSet<HTMLIFrameElement>();
function themeDocument(doc:Document){
 const root=doc.documentElement;
 if(!root)return; // A newly mounted frame may still be navigating.
 for(const [name,value] of overrides)if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);
 for(const child of Array.from(doc.querySelectorAll<HTMLIFrameElement>('iframe'))){
  if(!observedFrames.has(child)){observedFrames.add(child);child.addEventListener('load',apply)}
  if(child.contentDocument)themeDocument(child.contentDocument);
 }

}
function apply(){themeDocument(document)}
const original=getComputedStyle(document.documentElement);
const initialColors={} as ThemePalette;
for(const key of editable){const name=`--pb-${key}`;const label=document.createElement('label');label.className='palette-field';const input=document.createElement('input');input.type='color';input.value=original.getPropertyValue(name).trim();initialColors[key]=input.value;input.dataset.token=name;const span=document.createElement('span');span.textContent=key.replaceAll('-',' ');label.append(span,input);document.querySelector('#palette-fields')!.append(label);input.addEventListener('input',()=>{overrides.set(name,input.value);apply();storeDraft();renderState()})}
frame.addEventListener('load',apply);
// Internal preview only: discover lazily mounted game frames and keep their palette in sync.
window.setInterval(()=>{if(overrides.size)apply()},500);
document.querySelector('#reset-theme')!.addEventListener('click',()=>{const style=library?.styles.find(s=>s.id===selectedId);if(style)loadStyle(style.id)});
document.querySelector('#export-theme')!.addEventListener('click',()=>{const output=document.querySelector<HTMLTextAreaElement>('#theme-export')!;output.hidden=false;output.value=`:root {\n${[...overrides].map(([name,value])=>`  ${name}: ${value};`).join('\n')}\n}`});
document.querySelector<HTMLSelectElement>('#preview-size')!.addEventListener('change',event=>{frame.style.width=(event.target as HTMLSelectElement).value});

const draftKey='picklebash-design-draft-v1';
const select=document.querySelector<HTMLSelectElement>('#saved-style')!;
const nameInput=document.querySelector<HTMLInputElement>('#style-name')!;
const status=document.querySelector<HTMLElement>('#style-status')!;
const saveNew=document.querySelector<HTMLButtonElement>('#save-new-style')!;
const update=document.querySelector<HTMLButtonElement>('#update-style')!;
const use=document.querySelector<HTMLButtonElement>('#apply-style')!;
let library:StyleLibrary|undefined,selectedId='',busy=false;
function palette():ThemePalette{return Object.fromEntries(editable.map(key=>[key,overrides.get(`--pb-${key}`)??initialColors[key]])) as ThemePalette}
function dirty(){const saved=library?.styles.find(s=>s.id===selectedId);return !saved||nameInput.value.trim()!==saved.name||editable.some(key=>palette()[key]!==saved.colors[key])}
function storeDraft(){try{localStorage.setItem(draftKey,JSON.stringify({id:selectedId,name:nameInput.value,colors:palette()}))}catch{status.textContent='Draft recovery is unavailable. Save a named style to keep these colors.'}}
function renderState(){
 const changed=dirty();saveNew.disabled=busy||!library||!nameInput.value.trim();update.disabled=busy||!library||!selectedId||!changed||!nameInput.value.trim();use.disabled=busy||!library||!selectedId||changed;
 select.disabled=busy||!library;nameInput.disabled=busy;
 document.querySelector<HTMLButtonElement>('#reset-theme')!.disabled=busy||!library||!selectedId;
 document.querySelectorAll<HTMLInputElement>('#palette-fields input').forEach(input=>input.disabled=busy);
 if(!busy&&library)status.textContent=changed?'Unsaved changes · save or update this style before using it in the app.':library.activeId===selectedId?'Saved · currently used in the app.':'Saved · previewing only. Choose Use in app when ready.';
}
function renderLibrary(){select.replaceChildren();for(const style of library!.styles){const option=document.createElement('option');option.value=style.id;option.textContent=style.name+(library!.activeId===style.id?' · In app':'');select.append(option)}select.value=selectedId}
function setPalette(colors:ThemePalette){for(const key of editable){overrides.set(`--pb-${key}`,colors[key]);document.querySelector<HTMLInputElement>(`[data-token="--pb-${key}"]`)!.value=colors[key]}apply()}
function loadStyle(id:string){const style=library?.styles.find(s=>s.id===id);if(!style)return;selectedId=id;nameInput.value=style.name;setPalette(style.colors);renderLibrary();storeDraft();renderState()}
async function request(body?:Record<string,unknown>){
 const response=await fetch('/__design/styles',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Saving requires the local development server. Run npm run dev.');
 const data=await response.json();if(!response.ok)throw new Error(data.error??'Could not save the style.');return data;
}
async function save(asNew:boolean){
 if(!library||busy)return;busy=true;renderState();status.textContent='Saving style…';
 try{const result=await request({action:'save',...(asNew?{}:{id:selectedId}),name:nameInput.value,colors:palette()});library=validateLibrary(result.library);selectedId=result.style.id;loadStyle(selectedId);busy=false;renderState();status.textContent=`Saved “${result.style.name}” in this project.`}
 catch(error){busy=false;renderState();status.textContent=(error as Error).message}
}
select.addEventListener('change',()=>{const next=select.value;if(dirty()&&!window.confirm('Load another style and discard these unsaved changes?')){select.value=selectedId;return}loadStyle(next)});
nameInput.addEventListener('input',()=>{storeDraft();renderState()});
saveNew.addEventListener('click',()=>void save(true));update.addEventListener('click',()=>void save(false));
use.addEventListener('click',async()=>{
 if(!library||busy||dirty())return;busy=true;renderState();status.textContent='Applying saved style…';storeDraft();
 try{const result=await request({action:'apply',id:selectedId});library=validateLibrary(result.library);busy=false;renderLibrary();renderState();status.textContent=`“${result.style.name}” is now used in the app. Production will use it on the next build.`}
 catch(error){busy=false;renderState();status.textContent=(error as Error).message}
});
void (async()=>{
 try{library=validateLibrary((await request()).library);let recovered=false;
  try{const draft=JSON.parse(localStorage.getItem(draftKey)??'null');if(draft&&typeof draft.name==='string'&&draft.name.length<=60&&library.styles.some(s=>s.id===draft.id)){const colors=validatePalette(draft.colors);selectedId=draft.id;nameInput.value=draft.name;setPalette(colors);recovered=true}}
  catch{/* A bad recovery draft does not replace the saved project styles. */}
  if(recovered){renderLibrary();renderState()}else loadStyle(library.styles.find(s=>s.id==='hot-pink')?.id??library.activeId??library.styles[0]?.id??'');
 }catch(error){status.textContent=(error as Error).message}
})();
