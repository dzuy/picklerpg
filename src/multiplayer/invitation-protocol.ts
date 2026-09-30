import type {CourtTheme} from '../fun-themes';
import {type CourtLocation} from '../locations';
import type {DesignedPlayer} from '../player-design';
import type {CreateRemoteMatch} from './protocol';
export type TeamSelection=[DesignedPlayer,DesignedPlayer];
export interface InviteRequest {courtTheme?:CourtTheme;playerTheme?:CourtTheme;requestId:string;opponentId:string;team:TeamSelection;court:CourtLocation;target?:number;scoring:CreateRemoteMatch['scoring']}
export interface Invitation {courtTheme?:CourtTheme;automaticRematch?:boolean;id:string;creatorId:string;recipientId:string;creatorName:string;recipientName:string;team:TeamSelection;court:CourtLocation;target?:number;scoring:CreateRemoteMatch['scoring'];status:'pending'|'accepted'|'declined'|'cancelled'|'deleted';createdAt:string;matchId:string|null}
