/** Compare archetype behavior through real auto-play; four identical characters per matchup. */
import {Match} from '../src/match';
import {newPlayer} from '../src/player-design';
import {ARCHETYPES} from '../src/engine/player-profiles';
import {SLOTS} from '../src/engine/checkpoint';
for(const [archetype,profile] of Object.entries(ARCHETYPES)){
const counts:Record<string,number>={};let games=0,points=0;
for(let seed=1;seed<=4;seed++){
 const m=new Match(),p=newPlayer(`created-${archetype}`);p.skills={...profile.skills};
 m.scoringPreference='rally-doubles';m.captureReplay=false;m.brainMode='local';m.seed=seed;m.playerAutonomy=true;m.partnerAutonomy=true;
 for(const id of SLOTS)m.substitutePlayer(id,p);m.reset();m.scoring.rules.target=3;
 let seen=0;
 for(let step=0;step<30000&&!m.scoring.winner;step++){
  m.update(.1);
  for(const intent of m.state.shotHistory.slice(seen))counts[intent.type]=(counts[intent.type]??0)+1;
  seen=m.state.shotHistory.length;
  if(m.state.phase==='complete'){points++;if(!m.scoring.winner){m.nextPoint();seen=0;}}
 }
 if(m.scoring.winner)games++;
}
console.log(JSON.stringify({archetype,games,points,shots:Object.values(counts).reduce((a,b)=>a+b,0),counts}));
}
