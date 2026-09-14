import {Match} from '../match';
import type {MatchCheckpoint} from './checkpoint';
import type {LocalPlayerId} from './controllers';
import type {ShotIntent} from './model';
/** Cadence lives here, not in checkpoint advancement or a delivery transport. */
export interface TurnAction {decisionId:string;playerId:LocalPlayerId;intent:ShotIntent;timing?:'air'|'bounce'}
export function resolveTurn(checkpoint:MatchCheckpoint,action:TurnAction){
 const match=Match.fromCheckpoint(checkpoint);
 match.submitTurn(action);
 return {state:match.exportCheckpoint(),fromRevision:checkpoint.revision,toRevision:match.exportCheckpoint().revision};
}
