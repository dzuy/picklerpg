import type {DesignedPlayer} from '../player-design';
import type {GameState,PlayerId,PointResult,ShotIntent,Team,Vec3} from '../engine/model';
import type {ScoringRules} from '../engine/scoring';
export interface RemoteAction {
 actionId:string;expectedVersion:number;decisionId:string;
 action:{kind:'play_shot';intent:ShotIntent;timing?:'air'|'bounce'};
}
export interface CreateRemoteMatch {creationId:string;opponentId:string;roster:Record<PlayerId,DesignedPlayer>;scoring:'rally-doubles'|'side-out-doubles'}
/** Explicit public projection. Never substitute a MatchCheckpoint or RallyShot here. */
export interface PublicMatch {
 archived?:boolean;
 court?:'forest'|'venice'|'arizona';
 accountIds?:Record<Team,string>;
 createdAt?:string;
 id:string;version:number;status:'active'|'completed';viewerTeam:Team;currentTeam:Team|null;decisionId:string;
 rules:ScoringRules;score:Record<Team,number>;serveCall:string;serving?:boolean;server:PlayerId;pointIndex:number;
 nextHitter?:PlayerId|null;
 display:GameState;roster:Record<PlayerId,DesignedPlayer>;
 choices:Array<{intent:ShotIntent;timing?:'air'|'bounce'}>;result:PointResult|null;
 animation:TurnAnimation[];
}
export interface TurnAnimation {intent:ShotIntent;actor:PlayerId;duration:number;path:Vec3[];pathTimes?:number[];from:GameState['players'];to:GameState['players']}
export interface ActionReceipt {actionId:string;fromVersion:number;toVersion:number;state:PublicMatch}
export interface RemoteConfig {selfId:string;selfName?:string;creationEnabled:boolean;testers:Array<{id:string;name:string}>}
