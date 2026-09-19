import type {Match} from '../../src/match';
import type {PlayerId,PointResult,ShotIntent} from '../../src/engine/model';
import type {ShotContext} from '../../src/engine/shot-families';
import type {RemoteAction} from '../../src/multiplayer/protocol';

/** Private server contract. Versions change whenever menu/context semantics change. */
export interface SelectionCapture {
 schemaVersion:1;
 definitionVersion:'selection-1';
 pointIndex:number;
 completedContacts:number;
 offered:Array<{intent:ShotIntent;timing:'air'|'bounce'|null}>;
 contexts:Array<{actor:PlayerId;timing:'air'|'bounce'|null;context:ShotContext}>;
 players:Array<{id:PlayerId;position:{x:number;y:number;z:number};handedness:'left'|'right'}>;
 execution:{selectedShotExecuted:boolean;contactOrdinal:number|null;terminalContactOrdinal:number|null;terminalIntent:ShotIntent|null;pointResult:PointResult|null};
}
export type SelectionOpportunity=Omit<SelectionCapture,'execution'>;
/** Call before submitTurn: later checkpoints can already belong to the next point. */
export function selectionOpportunity(match:Match):SelectionOpportunity {
 return {schemaVersion:1,definitionVersion:'selection-1',pointIndex:match.point,
  completedContacts:match.state.shotHistory.length,
  offered:match.targetingMenu.map(c=>({intent:structuredClone(c.intent),timing:c.timing??null})),
  contexts:match.selectionContexts,
  players:match.state.players.map(p=>({id:p.id,position:{...p.position},handedness:p.handedness})),
 };
}
/** Call after settlement, before nextPoint. A failed reception may execute no reply. */
export function selectionCapture(before:SelectionOpportunity,match:Match,action:RemoteAction['action']):SelectionCapture {
 const history=match.state.shotHistory,added=history.length-before.completedContacts;
 if(match.point!==before.pointIndex||added<0||added>1)throw new Error('Unexpected selection/contact boundary.');
 const executed=added===1;
 if(executed&&history.at(-1)!.actor!==action.intent.actor)throw new Error('Unexpected selected hitter.');
 const result=match.state.result?structuredClone(match.state.result):null;
 return {...before,execution:{selectedShotExecuted:executed,contactOrdinal:executed?history.length:null,
  terminalContactOrdinal:result&&history.length?history.length:null,
  terminalIntent:result&&history.length?structuredClone(history.at(-1)!):null,pointResult:result}};
}
