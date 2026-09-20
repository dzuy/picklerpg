import type {ShotIntent} from './engine/model';
import {isSpeedUp} from './engine/speed-up';

/** Describe the committed incoming intent, never an unplayed menu option. */
export function incomingShotLabel(intent:ShotIntent|undefined,serving=false):string|null{
 if(serving)return 'Your serve';
 if(!intent)return null;
 if(intent.type==='lob')return 'High lob incoming';
 if(intent.type==='serve'&&intent.intendedNetClearance>1)return 'Lob serve incoming';
 if(isSpeedUp(intent))return 'Speed-up incoming';
 const names:Record<ShotIntent['type'],string>={serve:'serve',return:'return',drive:'drive',drop:'drop',dink:'dink',reset:'reset',volley:'volley',counter:'counter',block:'block',overhead:'overhead',lob:'lob',flick:'flick'};
 const spin=intent.spin;
 const modifier=intent.type==='overhead'&&intent.pace==='fast'?'Strong':spin?.vertical==='slice'?'Sliced':spin?.vertical==='topspin'?'Topspin':spin&&spin.side!=='none'?'Curving':intent.pace==='fast'?'Fast':intent.pace==='soft'?'Soft':'';
 const copy=`${modifier?modifier+' ':''}${names[intent.type]} incoming`;
 return copy[0].toUpperCase()+copy.slice(1);
}
