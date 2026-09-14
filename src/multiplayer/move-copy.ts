import type {ShotType,PointResult} from '../engine/model';
import type {PublicMatch} from './protocol';

// Stable per move: refreshes, replay and the other device get the same call.
function pick(s:PublicMatch,key:string,lines:readonly string[]){
 let hash=2166136261;for(const c of `${s.id}:${key}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return lines[((hash>>>0)+s.version)%lines.length];
}
const shots:Record<ShotType,string[]>={
 serve:['{a} gets things started!','{a} serves it up!','Here comes the serve from {a}!','{a} puts the ball in play!','{a} opens the rally!','Service, courtesy of {a}!'],
 return:['{a} sends it right back!','Return delivery from {a}!','{a} answers the serve!','{a} gets the return away!','{a} says: back to you!','{a} is in this rally!'],
 drive:['{a} drives it!','{a} goes for the drive!','A drive from {a}! Game on!','{a} sends a drive across!','{a} brings out the drive!','{a} keeps the pressure on with a drive!'],
 overhead:['{a} smashes it!!','{a} goes BOOM overhead!','Look up! {a} brings the smash!','{a} unloads an overhead!','Smash time for {a}!','{a} brings it down from the sky!'],
 dink:['{a} sneaks in a dink!','Soft hands from {a}!','{a} plays the patient dink!','{a} turns down the volume. Dink!','A little dink from {a}!','{a} keeps it delicate!'],
 drop:['{a} floats a drop!','{a} takes the pace off!','Drop shot from {a}!','{a} goes for the soft touch!','{a} drops it into the mix!','A change of pace from {a}!'],
 volley:['{a} takes it out of the air!','No bounce needed for {a}!','{a} punches a volley!','Quick hands! {a} volleys!','{a} meets it in the air!','{a} goes straight to the volley!'],
 lob:['{a} sends it skyward!','Up, up and away from {a}!','{a} launches a lob!','Everybody look up! A lob from {a}!','{a} takes the high road!','{a} puts some sky on it!'],
 block:['{a} puts up the block!','{a} says: hold on a second!','{a} gets a paddle on it!','A block from {a}! Still in this!','{a} absorbs it with a block!','{a} brings out the defensive hands!'],
 reset:['{a} hits the reset button!','{a} takes a little heat off!','{a} slows things down!','A calming reset from {a}!','{a} changes the rhythm!','{a} goes soft with the reset!'],
 counter:['{a} fires a counter!','{a} answers right back!','{a} turns defense into offense!','Counterattack from {a}!','{a} gives it right back!','{a} has a reply for that!'],
 flick:['{a} flicks it away!','A quick flick from {a}!','{a} snaps the wrist!','{a} brings out the flick!','Blink and miss it! {a} flicks!','{a} adds a little wrist action!'],
};
const fastDrives=['{a} hits a HARD drive. Yikes!','{a} turns up the heat!','That drive from {a} has some ZIP!','{a} fires a rocket of a drive!','{a} goes full throttle on the drive!','Watch out! {a} rips it!'];
const outcomes:Record<PointResult['reason'],string[]>={
 'body-hit':['Body bag! That one hits a player!','Oof! A body shot ends the rally!','Caught by the ball! Point over!','A body hit decides it!'],
 winner:['Clean winner! What a finish!','That is a WINNER!','Untouchable! Point over!','What a way to finish the rally!'],
 net:['Oh no! Into the net!','The net says NO!','Caught in the net! Rally over!','Not enough clearance! The net takes it!'],
 out:['Just OUT!','Too far! That one is out!','Out of bounds! Rally over!','The ball is OUT! So close!'],
 'double-bounce':['Two bounces! Too late!','A second bounce ends it!','Nobody gets there before bounce two!','Double bounce! The rally is over!'],
 'missed-swing':['Swing and a miss!','Whiff! That ends the rally!','No contact! Point over!','The paddle misses! Rally over!'],
 'failed-return':['No return! The rally ends there!','The return does not come back!','That is the end of this exchange!','No answer on the return!'],
 'unreturned-attack':['No answer to that attack!','That attack goes unreturned!','Too much to handle! Point over!','The attack ends the rally!'],
};
const bodyHits=['OMG {v} got body bagged!','Oof! {v} gets tagged!','Body bag on {v}! Yikes!','{v} gets caught by the ball!','Direct hit on {v}!','The ball finds {v}! Ouch!'];
export function moveCopy(s:PublicMatch){
 const last=s.animation.at(-1);
 if(!last)return pick(s,'opening',['Let’s get this rally started!','Paddles ready. Here we go!','A fresh rally. Bring it on!','The court is ready for action!']);
 if(s.result){
  const victim=s.result.reason==='body-hit'&&s.result.playerId?s.roster[s.result.playerId]?.name:null;
  if(victim)return pick(s,'body-hit',bodyHits).replaceAll('{v}',victim);
  return pick(s,s.result.reason,outcomes[s.result.reason]);
 }
 const hitter=s.roster[last.actor],phrase=hitter.catchphrase?.trim();
 if(phrase&&pick(s,'catchphrase',['quote','shot','shot','shot'])==='quote')return `${hitter.name}: “${phrase}”`;
 const lines=last.intent.type==='drive'&&last.intent.pace==='fast'?fastDrives:shots[last.intent.type];
 return pick(s,last.intent.type,lines).replaceAll('{a}',s.roster[last.actor].name);
}
