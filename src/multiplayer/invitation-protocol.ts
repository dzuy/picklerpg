import type {DesignedPlayer} from '../player-design';
import type {CreateRemoteMatch} from './protocol';
export type TeamSelection=[DesignedPlayer,DesignedPlayer];
export interface InviteRequest {requestId:string;opponentId:string;team:TeamSelection;court:'forest';scoring:CreateRemoteMatch['scoring']}
export interface Invitation {id:string;creatorId:string;recipientId:string;creatorName:string;recipientName:string;team:TeamSelection;court:'forest';scoring:CreateRemoteMatch['scoring'];status:'pending'|'accepted'|'declined'|'cancelled'|'deleted';createdAt:string;matchId:string|null}
