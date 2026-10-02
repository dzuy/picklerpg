import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('remote-main.ts',readFileSync('src/multiplayer/remote-main.ts','utf8'),ts.ScriptTarget.Latest,true);
const functions=source.statements.filter(node=>ts.isFunctionDeclaration(node)&&['lobby','refreshTeamDirectory'].includes(node.name?.text??'')).map(node=>node.getText(source)).join('\n');
const code=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(failure:'config'|'games'|'directory'|'credentials'){
 const calls:string[]=[],states:string[]=[];
 const element={hidden:false,replaceChildren(){},append(){}};
 const context:any=vm.createContext({URL,location:{href:'http://localhost/play?tab=friends'},history:{replaceState(){}},document:{createElement:()=>({...element})},el:()=>element,existingPlayer:{},session:null,animation:[],display:null,shot:null,config:null,selectedInvite:null,account:'',teamDirectory:null,teamDirectoryState:'loading',
  gamesLoadState(){},renderGames(){},renderInvitations(){},status(){},leaveCourt(){},clearTarget(){},
  renderTeamLobby:()=>states.push(context.teamDirectoryState),
  matchCredentials:async()=>{if(failure==='credentials')throw Error('Session failed');return {owner:'owner',token:'token'};},
  remoteRequest:async(_token:string,path:string)=>{calls.push(path);if(path.endsWith('/config')){if(failure==='config')throw Error('Config timed out');return {testers:[],creationEnabled:true};}if(failure==='directory')throw Error('Directory timed out');return {self:{id:'owner'},friends:['friend'],teams:[{id:'friend'}]};},
  refreshLobbyCards:async()=>{if(failure==='games')throw Error('Games timed out');},
 });
 vm.runInContext(code,context);return {context,calls,states};
}
for(const failure of ['config','games'] as const)test(`friends load independently when ${failure} fails`,async()=>{
 const {context,calls}=harness(failure);
 await assert.rejects(context.lobby(),/timed out/);
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls.includes('/api/multiplayer/teams'));
 assert.equal(context.teamDirectoryState,'ready');
 assert.deepEqual(context.teamDirectory.friends,['friend']);
});
test('failed directory leaves loading and can be retried',async()=>{
 const {context,states}=harness('directory');await context.lobby();
 assert.equal(context.teamDirectoryState,'error');
 context.remoteRequest=async()=>({friends:['friend'],teams:[]});
 await context.refreshTeamDirectory();
 assert.equal(context.teamDirectoryState,'ready');assert.deepEqual(states.slice(-3),['error','loading','ready']);
});
test('credential failure also leaves the loading state',async()=>{
 const {context}=harness('credentials');await assert.rejects(context.lobby(),/Session failed/);
 assert.equal(context.teamDirectoryState,'error');
});
