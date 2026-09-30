import type {CourtTheme} from './fun-themes';
import {browserStorage} from './browser-storage';
/** Independent from paddle/ball cues; no playback until a user gesture. */
export class FunAudio {
 private audio=new Audio();private theme:CourtTheme='none';private unlocked=false;
 enabled=browserStorage.getItem('pickle-theme-music-v1')==='on';
 private gesture=()=>{this.unlocked=true;this.sync()};private visibility=()=>this.sync();
 constructor(){this.audio.loop=true;this.audio.volume=.16;document.addEventListener('pointerdown',this.gesture);document.addEventListener('keydown',this.gesture);document.addEventListener('visibilitychange',this.visibility)}
 setTheme(theme:CourtTheme){if(theme===this.theme)return;this.theme=theme;this.audio.pause();if(theme!=='none')this.audio.src=`/assets/fun-pack/${theme}/music.wav`;this.sync()}
 setEnabled(enabled:boolean){this.enabled=enabled;this.unlocked=true;browserStorage.setItem('pickle-theme-music-v1',enabled?'on':'off');this.sync()}
 private sync(){if(!this.enabled||!this.unlocked||document.hidden||this.theme==='none'){this.audio.pause();return}if(this.audio.paused)void this.audio.play().catch(()=>{})}
 control(){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=this.enabled;input.onchange=()=>this.setEnabled(input.checked);label.append(input,' Theme music');return label}
 dispose(){this.audio.pause();this.audio.removeAttribute('src');this.audio.load();document.removeEventListener('pointerdown',this.gesture);document.removeEventListener('keydown',this.gesture);document.removeEventListener('visibilitychange',this.visibility)}
}
