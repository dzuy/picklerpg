export interface RematchStatus {
 invitationId:string|null;matchId:string|null;requesterId:string|null;
 status:'none'|'pending'|'accepted'|'declined'|'cancelled'|'deleted';
}
