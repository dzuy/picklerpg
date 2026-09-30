import manifest from '../../public/assets/fun-pack/manifest.json';
import {COURT_LOCATIONS,courtName} from '../../src/locations';

const themes=manifest.themes;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const root='/assets/fun-pack/';
const path=(theme:string,file:string)=>`${root}${theme}/${file}`;
let explored=themes[0],playerTheme=themes[0],look=0;
let courtTheme='',pendingTheme='',playing=false,toastTimer=0,celebrationTimer=0;
type Look={theme:string;look:number;paddle:string};
let lineup:Look[]=[{theme:'',look:0,paddle:''},{theme:'',look:1,paddle:''}],previous:Look[]|null=null;
const dialog=$<HTMLDialogElement>('apply-dialog'),audio=$<HTMLAudioElement>('audio');
const courtSelect=$<HTMLSelectElement>('court'),courtThemeSelect=$<HTMLSelectElement>('court-theme'),playerThemeSelect=$<HTMLSelectElement>('player-theme'),paddleSelect=$<HTMLSelectElement>('paddle-theme');
const themeOptions=themes.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
courtThemeSelect.innerHTML='<option value="">None · Original court</option>'+themeOptions;
playerThemeSelect.innerHTML=themeOptions;paddleSelect.innerHTML=themeOptions;
courtSelect.innerHTML=COURT_LOCATIONS.map(c=>`<option value="${c.id}">${courtName(c.id)}</option>`).join('');
courtSelect.value='venice';
function notify(text:string){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').textContent='',3500)}
function renderLineup(){
 $('lineup').innerHTML=lineup.map((p,i)=>{const t=themes.find(t=>t.id===p.theme);return `<div class="lineup-player">${t?`<img src="${path(t.id,`player-${p.look+1}.svg`)}" alt="${t.looks[p.look]}">`:'<span aria-hidden="true" style="font-size:30px;padding:10px">☺</span>'}<div><strong>${i?'Sam':'Alex'}</strong><small>${t?t.looks[p.look]:'Current look'}${t&&p.paddle!==p.theme?' · Custom':''}</small></div></div>`}).join('');
 $('undo').hidden=!previous;
}
function renderCourt(){
 const c=COURT_LOCATIONS.find(c=>c.id===courtSelect.value)!;const t=themes.find(t=>t.id===courtTheme);
 $<HTMLImageElement>('base-court').src=c.image;$<HTMLImageElement>('base-court').alt=courtName(c.id);
 const overlay=$<HTMLImageElement>('court-overlay');overlay.hidden=!t;if(t)overlay.src=path(t.id,'court-overlay.svg');
 $('court-label').textContent=courtName(c.id);$('theme-label').textContent=t?t.name:'Original atmosphere';
 $('court-note').textContent=t?'Theme decorations + music. Your court stays your court.':'Choose a theme to dress up this court.';
 $('bpm').textContent=t?`${t.bpm} BPM · 8 bars`:'';
 renderComparisons();
}
function renderComparisons(){const c=COURT_LOCATIONS.find(c=>c.id===courtSelect.value)!;
 $('comparison-grid').innerHTML=themes.map(t=>`<div class="comparison-item"><div class="crop"><img src="${c.image}" alt="${courtName(c.id)}"><img src="${path(t.id,'court-overlay.svg')}" alt="${t.name} decorations"></div><p>${t.name}</p></div>`).join('');
}
function stopCelebration(){clearTimeout(celebrationTimer);$('player-figure').className='';$('celebration').hidden=true;$('celebration').className=''}
function renderPlayer(){
 stopCelebration();playerThemeSelect.value=playerTheme.id;
 $<HTMLImageElement>('player-art').src=path(playerTheme.id,`player-${look+1}-body.svg`);$<HTMLImageElement>('player-art').alt=playerTheme.looks[look];
 $('look-name').textContent=playerTheme.looks[look];
 $('looks').innerHTML=playerTheme.looks.map((name,i)=>`<button type="button" aria-pressed="${look===i}" data-look="${i}">${name}</button>`).join('');
 $('looks').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{look=Number(b.dataset.look);renderPlayer()});
 renderPaddle();
}
function renderPaddle(){
 const mixed=paddleSelect.value!==playerTheme.id;$('look-state').textContent=mixed?'Custom':'Full theme';
 $<HTMLImageElement>('paddle').src=path(paddleSelect.value,'paddle.svg');
 $<HTMLImageElement>('equipped-paddle').src=path(paddleSelect.value,'paddle.svg');
}
function renderCollection(){
 $('themes').innerHTML=themes.map(t=>`<button type="button" data-theme="${t.id}" aria-pressed="${t.id===explored.id}"><img src="${path(t.id,t.props[0]+'.svg')}" alt=""><span><strong>${t.name}</strong><small>${t.eyebrow}</small></span></button>`).join('');
 $('themes').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{explored=themes.find(t=>t.id===b.dataset.theme)!;playerTheme=explored;look=0;paddleSelect.value=explored.id;renderCollection();renderPlayer();selectCourtTheme(explored.id)});
 $('collection-title').textContent=explored.name;$('collection-description').textContent=explored.description;
 $('assets').innerHTML=[...explored.props,'paddle'].map(p=>`<a href="${path(explored.id,p+'.svg')}" target="_blank" rel="noopener"><img src="${path(explored.id,p+'.svg')}" alt="${p}">${p[0].toUpperCase()+p.slice(1)}</a>`).join('');
 $('music-title').textContent=`${explored.name} · ${explored.bpm} BPM · ${explored.celebration}`;
}
async function syncAudio(){
 const t=themes.find(t=>t.id===courtTheme);if(!playing||!t){audio.pause();playing=false;renderAudio();return}
 const src=path(t.id,'music.wav');if(audio.getAttribute('src')!==src){audio.src=src;audio.load()}
 try{await audio.play()}catch{playing=false;notify('Music could not play. Try Play music again.')}renderAudio();
}
function renderAudio(){$('sound').textContent=playing?'♫ Pause music':'♫ Play music';$('sound').setAttribute('aria-pressed',String(playing))}
function selectCourtTheme(id:string){
 const changed=courtTheme!==id;courtTheme=id;courtThemeSelect.value=id;renderCourt();void syncAudio();
 if(changed&&id&&lineup.some(p=>p.theme!==id||p.paddle!==id)){
  pendingTheme=id;const t=themes.find(t=>t.id===id)!;$('dialog-title').textContent=`Use ${t.name} for your players too?`;
  $<HTMLImageElement>('dialog-icon').src=path(id,t.props[0]+'.svg');dialog.returnValue='';dialog.showModal();
 }
}
courtThemeSelect.onchange=()=>selectCourtTheme(courtThemeSelect.value);
courtSelect.onchange=renderCourt;
playerThemeSelect.onchange=()=>{playerTheme=themes.find(t=>t.id===playerThemeSelect.value)!;look=0;paddleSelect.value=playerTheme.id;renderPlayer()};
paddleSelect.onchange=renderPaddle;
$('reset-look').onclick=()=>{paddleSelect.value=playerTheme.id;renderPaddle();notify('Full theme reapplied.')};
$('save-look').onclick=()=>{previous=lineup.map(p=>({...p}));lineup[0]={theme:playerTheme.id,look,paddle:paddleSelect.value};renderLineup();notify('Alex’s look updated for this preview.')};
$('undo').onclick=()=>{if(previous){lineup=previous;previous=null;renderLineup();notify('Previous player looks restored.')}};
dialog.addEventListener('close',()=>{if(dialog.returnValue==='apply'){
 previous=lineup.map(p=>({...p}));lineup=lineup.map((_,i)=>({theme:pendingTheme,look:i,paddle:pendingTheme}));renderLineup();notify('Theme applied to Alex and Sam.');
 }pendingTheme=''});
dialog.querySelectorAll<HTMLButtonElement>('button[value]').forEach(button=>{button.type='button';button.onclick=()=>dialog.close(button.value)});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close('keep')}});
$('sound').onclick=()=>{if(!courtTheme){notify('Choose a court theme to hear its music.');return}playing=!playing;void syncAudio()};
$('celebrate').onclick=()=>{stopCelebration();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const art=$<HTMLImageElement>('celebration');art.src=path(playerTheme.id,'celebration.svg');art.hidden=false;
 if(!reduced){$('player-figure').className=`dance-${playerTheme.id}`;art.className='burst'}
 notify(playerTheme.celebration);celebrationTimer=window.setTimeout(stopCelebration,2400);
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;audio.pause();renderAudio();stopCelebration()}});
renderCollection();renderPlayer();renderCourt();renderLineup();
