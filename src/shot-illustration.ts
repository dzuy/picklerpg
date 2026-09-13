import type {ShotIntent} from './engine/model';

type Point = [number, number];
type Flight = [Point, Point, Point, Point];

const flights:Record<string,Flight>={
 flat:[[23,59],[37,49],[51,36],[66,25]],
 power:[[23,59],[39,46],[60,27],[76,14]],
 slow:[[23,59],[28,56],[36,49],[44,45]],
 backspin:[[23,59],[35,37],[52,27],[65,30]],
 topspin:[[23,59],[43,53],[59,34],[63,20]],
 slice:[[23,59],[39,54],[59,43],[69,24]],
 short:[[23,59],[30,41],[42,28],[57,29]],
 'short-topspin':[[23,59],[40,55],[52,38],[53,22]],
 lob:[[23,59],[37,6],[57,6],[67,42]],
 drop:[[23,59],[34,26],[49,28],[60,48]],
 dink:[[23,59],[34,36],[48,38],[58,51]],
 reset:[[23,53],[32,33],[47,35],[57,51]],
 block:[[23,44],[34,57],[47,56],[60,45]],
 overhead:[[23,23],[37,30],[52,45],[67,59]],
 body:[[23,59],[35,51],[48,40],[59,32]],
 return:[[23,59],[36,39],[53,31],[67,28]],
};

function visualKind(intent:ShotIntent):string{
 if(intent.target.kind==='player'&&intent.target.aim==='body')return 'body';
 if(intent.type==='lob'||['serve','return'].includes(intent.type)&&intent.intendedNetClearance>1)return 'lob';
 if(['drop','dink','reset','block','overhead'].includes(intent.type))return intent.type;
 const short=['serve','return'].includes(intent.type)&&intent.target.kind==='zone'&&intent.target.depth==='transition';
 if(intent.spin?.vertical==='slice')return 'backspin';
 if(intent.spin&&intent.spin.side!=='none')return 'slice';
 if(intent.spin?.vertical==='topspin')return short?'short-topspin':'topspin';
 if(short)return 'short';
 if(intent.pace==='fast')return 'power';
 if(intent.type==='serve'&&intent.pace==='soft')return 'slow';
 if(intent.type==='return')return 'return';
 return 'flat';
}

/** Taper the arrow along its curve; its head and shaft both grow with pace. */
function ribbon(flight:Flight,width:number):string{
 const [a,b,c,d]=flight,left:Point[]=[],right:Point[]=[];
 for(let step=0;step<=24;step++){
  const t=step/24,u=1-t;
  const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
  const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
  const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
  const dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
  const half=(.65+(width/2-.65)*t)/Math.hypot(dx,dy);
  left.push([x-dy*half,y+dx*half]);right.push([x+dy*half,y-dx*half]);
 }
 return `M${[...left,...right.reverse()].map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' L')} Z`;
}

const ball=(x:number,y:number,r:number)=>`<g class="shot-ball" transform="translate(${x} ${y}) scale(${r/9})"><circle r="9"/><ellipse class="shot-ball-shine" cx="-2.5" cy="-3" rx="5" ry="4"/><g fill="currentColor"><ellipse cx="-3.2" cy="-3.8" rx="1.45" ry="1.8" transform="rotate(-25 -3.2 -3.8)"/><ellipse cx="3.5" cy="-2.8" rx="1.4" ry="1.8" transform="rotate(-25 3.5 -2.8)"/><ellipse cx="-4" cy="2.9" rx="1.2" ry="1.6" transform="rotate(-25 -4 2.9)"/><ellipse cx="2" cy="4" rx="1.5" ry="1.8" transform="rotate(-25 2 4)"/></g></g>`;

export const pickleballMark=`<svg viewBox="0 0 48 48" aria-hidden="true">${ball(24,24,23)}</svg>`;

export function shotTraits(intent:ShotIntent):string{
 const spin=intent.spin;
 const traits=[`${intent.pace==='fast'?'High':intent.pace==='medium'?'Medium':'Soft'} power`];
 if(spin?.vertical&&spin.vertical!=='none')traits.push(`${spin.strength} ${spin.vertical}`);
 if(spin?.side&&spin.side!=='none')traits.push(`${spin.side} curve`);
 return traits.join(' · ');
}

/** Illustrations describe the actual intent, independently of the card's label. */
export function shotIcon(intent:ShotIntent,index:number,scope='dock'):string{
 const kind=visualKind(intent),flight=flights[kind];
 const [start,c1,c2,end]=flight;
 const width=kind==='power'?4.8:intent.pace==='fast'?3.6:intent.pace==='medium'?3.2:2.5;
 const angle=Math.atan2(end[1]-c2[1],end[0]-c2[0])*180/Math.PI;
 const head=kind==='power'?10:intent.pace==='fast'?8.5:7.5;
 const gradientId=`shot-gradient-${scope}-${index}-${intent.type}`;
 const spin=intent.spin?.vertical==='topspin'||intent.spin?.vertical==='slice';
 const side=intent.spin&&intent.spin.side!=='none';
 const dash=`M${start} C${c1} ${c2} ${end}`;
 return `<span class="shot-visual pace-${intent.pace} shot-kind-${kind}${spin?intent.spin?.vertical==='topspin'?' has-topspin':' has-backspin':''}${side?' has-sidespin':''}"><svg class="shot-icon" viewBox="0 0 84 84" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" gradientUnits="userSpaceOnUse"><stop class="shot-gradient-start"/><stop offset=".6" class="shot-gradient-middle"/><stop offset="1" class="shot-gradient-end"/></linearGradient></defs>${intent.pace==='fast'&&kind!=='body'?'<g class="shot-speed"><path d="m25 49 14-11"/><path d="m33 59 17-13"/></g>':''}${kind==='slice'?`<path class="shot-slice" stroke="url(#${gradientId})" stroke-width="${width}" d="${dash}"/>`:`<path class="shot-flight" fill="url(#${gradientId})" d="${ribbon(flight,width)}"/>`}<path class="shot-arrow" d="M${-head},${-head*.55} L1,0 L${-head},${head*.55} L${-head*.68},0 Z" transform="translate(${end}) rotate(${angle})"/>${spin?`<g class="shot-spin ball-spin spin-${intent.spin!.strength}" transform="translate(${start[0]-5} ${start[1]+5})${intent.spin!.vertical==='slice'?' scale(-1 1)':''}"><path d="M-12 -7 A14 14 0 0 1 12 -7 L8 -8 M12 -7 L12 -12"/><path d="M12 7 A14 14 0 0 1 -12 7 L-8 8 M-12 7 L-12 12"/></g>`:''}${side?`<path class="shot-spin shot-side-spin" d="M48 59q12-1 17-11m-4 2 5-3v5"${intent.spin!.side==='left'?' transform="translate(110 0) scale(-1 1)"':''}/>`:''}${kind==='body'?'<g class="shot-person"><circle cx="66" cy="49" r="5"/><path d="M57 69v-7a9 9 0 0 1 18 0v7q-9 5-18 0"/><path class="shot-person-detail" d="M62 63v8m8-8v8"/></g>':''}${ball(start[0]-5,start[1]+5,8.5)}</svg></span>`;
}
