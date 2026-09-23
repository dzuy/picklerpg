const INVITATION_QA=/^inviteqa_[ab]_[0-9a-f]{8}$/i;

export function isInvitationQaManager(manager:string){return INVITATION_QA.test(manager)}

/** A null game count means the record is still loading. */
export function canShowCommunityAccount(manager:string,games:number|null){
 return !isInvitationQaManager(manager)&&(games===null||games>0);
}
