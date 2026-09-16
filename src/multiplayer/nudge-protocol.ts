export interface NudgeStatus {
 unlimited?:boolean;
 state:'ready'|'waiting'|'daily_limit'|'already_nudged'|'not_waiting'|'finished'|'stale'|'unavailable';
 version:number;
 availableAt:string|null;
 serverTime:string;
}
export interface NudgeResult extends NudgeStatus {accepted:boolean}
