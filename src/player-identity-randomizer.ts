const handles=['picklehead','lobMonster','dinkNinja','kitchenBandit','paddleGoblin','rallyGremlin','dropShotBoss','netGoblin','picklePirate','dillDealer','volleyYeti','thirdShotHero','lobLobster','dinkWizard','paddlePunk','rallyRascal','kitchenGhost','picklePanda','spinDoctor','dillWithIt'];
const endings=['Greg','Zilla','Mode','Rex','Ace','23','99','007','42','88','11','3000'];
const phrases=['Dill with it.','Big dill energy.','You just got pickled.','Lob now. Brag later.','Dink responsibly.','Stay out of my kitchen.','All paddle. No panic.','One more rally. Always.','Fear the soft game.','My dink has an attitude.','Serving fresh trouble.','Keep calm and dink on.','Nice rally. My point.','Small court. Big pickle.','Zero chill. Soft hands.','Third shot, first class.','Brine time, baby.','Lettuce play. Pickles win.','I came. I saw. I dinked.','Meet me at the kitchen.'];
const pick=(items:readonly string[],random:()=>number)=>items[Math.floor(random()*items.length)];
export function randomPlayerName(current='',random:()=>number=Math.random){
 const choices=handles.flatMap(handle=>endings.map(end=>handle+end)).filter(name=>name!==current);
 return pick(choices,random);
}
export function randomPlayerCatchphrase(current='',random:()=>number=Math.random){return pick(phrases.filter(phrase=>phrase!==current),random);}
