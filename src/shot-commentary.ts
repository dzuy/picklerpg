import type {ShotIntent,PlayerState} from './engine/model';
import {assessShot,type ShotAssessment} from './shot-assessment';
import type {ShotContext} from './engine/shot-families';

/** Uses pre-contact estimates only: never predicts a known hidden outcome. */
export function shotCommentary(intent:ShotIntent,assessment:ShotAssessment|undefined,key:string,memory?:CommentaryMemory){
 const remembered=memory?.calls.get(key);if(remembered)return remembered;
 const soft=['reset','block','drop','dink'].includes(intent.type);
 let lines:readonly string[];
 if(intent.technique==='atp')lines=['Around the post! A bold angle to attempt.','Going around the post—precision is everything here.'];
 else if(intent.technique==='erne')lines=['An Erne attempt! Looking to steal time at the net.','Taking the outside route. Bold attacking intent.'];
 else if(assessment?.risk==='High')lines=soft?
  ['A delicate choice from here. Very little margin for error.','Trying to take the pace off—but this is a risky touch.','The soft option is no safe option here. Timing is crucial.']:
  ['Bold choice! There’s real risk in that shot.','A high-risk play. Let’s see if the gamble pays off.','Going for it! Execution will have to be sharp.','An ambitious selection. Not much room for error.'];
 else if(soft)lines=assessment?.risk==='Low'?
  ['Taking the pace off. A smart way to settle the rally.','Patience here. Making the opponent build the point.','Slowing things down. A composed decision.','Choosing control over pace. Good percentage play.']:
  ['Looking to soften the exchange. Touch is the key.','Changing the rhythm with a softer ball.','Choosing patience. The placement needs to be precise.'];
 else if(intent.type==='lob')lines=['Going upstairs! Looking to push the opponents back.','A change of height and pace. The depth will be crucial.','Testing them with a lob. An interesting change of rhythm.'];
 else if(assessment?.pressure==='High')lines=['Turning up the pressure. Asking for a quick response.','An attacking choice—looking to take time away.','Putting the defense to work. Positive intent.'];
 else if(intent.type==='serve')lines=['Setting the tone with the serve. Placement matters here.','Starting the point with a clear plan.','The serve sets the table. Let’s see what comes next.'];
 else if(intent.type==='return')lines=['The return is about building the next shot.','A measured reply. Looking to get established in the rally.'];
 else if(intent.type==='counter')lines=['Answering pace with pace. That takes conviction.','Turning defense into attack. Quick hands required.'];
 else if(intent.type==='overhead')lines=['Taking the overhead. Looking to seize the initiative.','An attacking opportunity. Placement over brute force.'];
 else lines=['Choosing to attack. Let’s see how the defense responds.','Adding pace to the exchange. A test of the opponent’s hands.','Positive intent. Looking to create an opening.'];
 let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 const category=intent.technique??(assessment?.risk==='High'?(soft?'riskySoft':'risky'):soft?(assessment?.risk==='Low'?'patient':'soft'):intent.type==='lob'?'lob':assessment?.pressure==='High'?'pressure':intent.type);
 const pool=[...lines,...(extraCalls[category]??extraCalls.attack)];
 const available=memory?pool.filter(line=>!memory.recent.includes(line)):pool;
 const chosen=(available.length?available:pool)[(hash>>>0)%(available.length||pool.length)];
 if(memory){memory.recent.push(chosen);if(memory.recent.length>8)memory.recent.shift();memory.calls.set(key,chosen);if(memory.calls.size>128)memory.calls.delete(memory.calls.keys().next().value!);}
 return chosen;
}
export function analyzeShot(intent:ShotIntent,context:ShotContext|undefined|null,players:PlayerState[],key:string,memory?:CommentaryMemory){
 let assessment:ShotAssessment|undefined;
 if(context)try{assessment=assessShot(intent,context,players);}catch{/* Commentary must never block a shot. */}
 return shotCommentary(intent,assessment,key,memory);
}

export type CommentaryMemory={recent:string[];calls:Map<string,string>};
export const createCommentaryMemory=():CommentaryMemory=>({recent:[],calls:new Map()});
const extraCalls:Record<string,readonly string[]>={
 atp:[
 'Taking the scenic route around the net. Precision required.',
 'The net has been politely removed from the itinerary.',
 'An ATP attempt! The court has a side door, apparently.',
 'Around the post. That angle comes with fine print.',
 'Bold geometry. Someone brought a protractor to pickleball.',
 'Trying the outside lane. No room to drift wide.',
 'An ATP! Audacious placement, demanding execution.',
 'The highlight reel has been contacted. Nothing confirmed yet.',
 'Going around the problem. Literally.'
 ],
 erne:[
 'An Erne! Looking to intercept, not exchange pleasantries.',
 'Taking the shortcut. The timing still has to be legal.',
 'An ambush at the kitchen door. Excellent dramatic intent.',
 'Sneaking around the kitchen. The feet need an alibi.',
 'An Erne attempt—anticipation meets ambition.',
 'Looking to cut off the reply before it gets comfortable.',
 'A surprise net attack. Timing is the entire business plan.',
 'Taking the outside lane to rush the next ball.',
 'An Erne! The kitchen has a very determined visitor.'
 ],
 riskySoft:[
 'Soft hands, hard assignment. That touch has to be exact.',
 'A risky touch shot. This is surgery with a paddle.',
 'Trying to whisper in a thunderstorm. Delicate touch required.',
 'Finesse with almost no safety net. Bold selection.',
 'Taking pace off from here? That is a precision project.',
 'A soft shot with sharp consequences if the touch slips.',
 'The gentle option has teeth here. Watch that margin.',
 'A risky bit of finesse. Confidence is doing some heavy lifting.',
 'A delicate ask of the paddle. No room for heavy hands.'
 ],
 risky:[
 'That shot has ambition. The margin has left the chat.',
 'Risk management would like a word.',
 'Bold choice. The percentage players just put down their coffee.',
 'Going for the spectacular. The simple option is filing a complaint.',
 'A tiny margin and a very large imagination.',
 'That is a statement shot. Punctuation still pending.',
 'High risk, high confidence. Only one helps the ball land.',
 'The paddle says yes. The percentages have questions.',
 'An adventurous choice. Travel insurance not included.',
 'Trying to win the argument in one swing.',
 'The safe option was apparently too boring.',
 'A difficult shot, selected with suspicious enthusiasm.'
 ],
 patient:[
 'Taking the heat out. Someone here has a thermostat.',
 'A measured soft shot. Patience has entered the building.',
 'Choosing control. This rally does not need a fireworks budget.',
 'Good percentage play. Boring can be very annoying to defend.',
 'Taking pace off instead of taking the bait.',
 'Calm hands. Making the other side supply the drama.',
 'A patient choice. No bonus points for swinging harder.',
 'Turning down the volume. Smart rally management.',
 'Choosing the soft route. Let the opponent get impatient.',
 'Controlled pace. A small act of competitive stubbornness.'
 ],
 soft:[
 'A softer ball to change the tempo. The touch must travel well.',
 'Looking to settle things down without floating a gift.',
 'Trying to take the sting out. Placement is doing the work.',
 'A touch shot. Delicate does not mean automatic.',
 'Changing the pace. A different problem for the next swing.',
 'Choosing finesse. No room for a heavy-handed delivery.',
 'Softening the exchange. Keep that ball on a short leash.',
 'A little restraint. Now the paddle has to cooperate.',
 'Taking pace out of the equation. Touch goes in its place.'
 ],
 lob:[
 'A lob! Making the sky part of the strategy.',
 'Sending it upstairs. Depth needs to match ambition.',
 'A high ball with a plan. Please tell me there is a plan.',
 'The lob: a tactical request for backward movement.',
 'Testing the overhead coverage. Interesting question to ask.',
 'Buying time with altitude. Now mind the landing.',
 'A change of elevation. Air traffic control is standing by.',
 'Going over the problem instead of through it.',
 'A lob. The opponent’s footwork is being invited to audition.'
 ],
 pressure:[
 'Taking time away. Very inconsiderate. Very competitive.',
 'Pressure applied. The defense has been given homework.',
 'Making the opponent solve this at speed.',
 'An attacking ball. The reply will need express shipping.',
 'Rushing the response. No leisurely paddle preparation here.',
 'Turning up the tempo. The hands had better be awake.',
 'A demanding ball. Customer service is not taking calls.',
 'Putting the defense on the clock.',
 'Attacking with purpose. The comfort zone is under renovation.',
 'Pressure, not politeness. A sound competitive policy.'
 ],
 serve:[
 'The opening delivery. Give the returner something to think about.',
 'Starting the conversation with a paddle. Keep it purposeful.',
 'The serve is an introduction, not the whole speech.',
 'Setting up the next ball. That is where the plan gets interesting.',
 'First ball, first question. What return will it draw?',
 'Opening the rally. Save some fireworks for later.',
 'Serving with intent. The third shot is already on the agenda.',
 'The invitation is airborne. A polite reply is unlikely.',
 'A serve with a job to do. Get the rally working for you.'
 ],
 return:[
 'Getting the reply in play. The rally is only getting started.',
 'Return first, heroics later. There is a sequence to these things.',
 'Answering the serve. Now build the next opportunity.',
 'The return sets up the rally. Do the ordinary job well.',
 'Sending the opening question back across the net.',
 'A return with a job to do. No style points required.',
 'Starting the reply. This point has more than one chapter.',
 'The first answer matters. Keep the bigger rally in mind.',
 'Return delivery. Signature probably not required.'
 ],
 counter:[
 'A counter! The pace is being returned to sender.',
 'Answering fire with fire. Subtlety can wait.',
 'Borrowing their pace. Aggressive recycling.',
 'A counterattack. The defense has developed opinions.',
 'Sending the pressure back with interest.',
 'Quick hands required. This is not a leisurely exchange.',
 'Turning their attack into a question of your own.',
 'A counter. Apparently the original message was not appreciated.',
 'Meeting the attack head-on. The hands have work to do.'
 ],
 overhead:[
 'Overhead selected. The ball has attracted some attention.',
 'Looking to finish from above. Accuracy still gets a vote.',
 'An overhead. Resist the urge to hit it into next Tuesday.',
 'A chance to attack. Placement beats a dramatic wind-up.',
 'The overhead is on. Power needs a forwarding address.',
 'Taking the high ball on. Make the angle do some work.',
 'An attacking choice. Aim before the victory speech.',
 'Overhead intent. The fence is not the target audience.',
 'Looking to put it away. No need to break the sound barrier.'
 ],
 attack:[
 'Adding pace. Let’s see whether it creates a problem.',
 'An attacking choice. The rally has been asked to hurry up.',
 'Looking for an opening. Brute force is only part of the application.',
 'Sending a firmer ball. The next reply will tell us more.',
 'Positive intent. The opponent’s paddle gets a vote too.',
 'Trying to seize the initiative. No permission slip needed.',
 'An assertive choice. Give that confidence some placement.',
 'Putting pace into the conversation.',
 'An attack with questions attached. Let’s hear the answer.',
 'Looking to make something happen. Occasionally an expensive hobby.'
 ]
};
