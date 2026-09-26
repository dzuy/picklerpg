import {COURT,type PlayerId,type ShotIntent,type ShotTarget,type ShotType} from './engine/model';

export type ShotNames=Partial<Record<PlayerId,string>>;

const defaultNames:Record<PlayerId,string>={you:'You',partner:'Finn','opponent-left':'Jules','opponent-right':'Rio'};
const verbs:Record<ShotType,string>={
 serve:'serves it',return:'returns it',drive:'drives it',block:'blocks it',
 overhead:'smashes it',drop:'drops it',dink:'dinks it',volley:'volleys it',
 reset:'resets it',lob:'lobs it',counter:'counters it',flick:'flicks it',
};
const verbsYou:Record<ShotType,string>={
 serve:'serve it',return:'return it',drive:'drive it',block:'block it',
 overhead:'smash it',drop:'drop it',dink:'dink it',volley:'volley it',
 reset:'reset it',lob:'lob it',counter:'counter it',flick:'flick it',
};

function destination(target:ShotTarget,names:ShotNames):string{
 if(target.kind==='player'){
  const player=names[target.playerId]?.trim()||defaultNames[target.playerId];
  return target.aim==='feet'?`at ${player}'s feet`:target.aim==='backhand-side'?`to ${player}'s backhand`:`at ${player}`;
 }
 if(target.kind==='point'){
  const distance=Math.abs(target.x);
  if(distance<.9)return 'down the middle';
  if(distance>COURT.width/2-.9)return 'wide';
  return target.x<0?'to the left':'to the right';
 }
 switch(target.zone){
  case 'middle':return 'down the middle';
  case 'crosscourt':return 'crosscourt';
  case 'line':return 'down the line';
  case 'wide':return 'wide';
  case 'open-court':return 'into the open court';
  case 'far-left':return 'to the left sideline';
  case 'far-right':return 'to the right sideline';
 }
}

/** Describes the selected shot without assessing its quality or predicting its result. */
export function shotCommentary(intent:ShotIntent,names:ShotNames={}):string{
 const actor=names[intent.actor]?.trim()||defaultNames[intent.actor];
 const target=destination(intent.target,names);
 const action=actor==='You'?verbsYou[intent.type]:verbs[intent.type];
 if(intent.technique==='atp')return `${actor} ${actor==='You'?'drive':'drives'} it around the post ${target}`;
 if(intent.technique==='erne')return `${actor} ${actor==='You'?'hit':'hits'} an Erne ${target}`;
 return `${actor} ${action} ${target}`;
}
