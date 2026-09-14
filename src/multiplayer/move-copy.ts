import type {PublicMatch} from './protocol';
export function moveCopy(s:PublicMatch){
 const last=s.animation.at(-1),name=(id:keyof PublicMatch['roster'])=>s.roster[id].name;
 const turn=s.status==='completed'?'Game finished.':s.currentTeam===s.viewerTeam?'Your turn!':'Waiting for your opponent.';
 if(!last)return `Ready to serve. ${turn}`;
 const verbs={serve:'served',return:'returned',drive:'drove',overhead:'smashed',drop:'dropped',dink:'dinked',volley:'volleyed',reset:'reset',lob:'lobbed',block:'blocked',counter:'countered',flick:'flicked'};
 let move=`${name(last.actor)} ${verbs[last.intent.type]} the ball${last.intent.type==='overhead'?' overhead':''}`;
 const receiver=s.display.currentHitter;
 if(!s.result&&receiver&&s.display.players.find(p=>p.id===receiver)?.team!==s.display.players.find(p=>p.id===last.actor)?.team)move+=` to ${name(receiver)}`;
 if(s.result){const own=s.result.winner===s.viewerTeam;move+=`. ${own?'Your team':'Their team'} won the point (${s.result.reason.replaceAll('-',' ')})`;}
 return `${move}. ${turn}`;
}
