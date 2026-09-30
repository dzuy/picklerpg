/** Aggregate-only contract; no person IDs or query credentials cross this boundary. */
export interface AnalyticsPeriod {
 active:number; accounts:number; completed:number; started:number; finished:number;
 participations:number; rematchEligible:number; rematched:number;
 invited:number; accepted:number; activated:number; inviteCompleted:number;
 retentionEligible:number; retained:number;
}
export interface AnalyticsDashboard {
 status:'ready'; days:7|30; start:string; end:string; previousStart:string;
 generatedAt:string; coverageSince:string; current:AnalyticsPeriod; previous:AnalyticsPeriod;
}
export function percentage(n:number,d:number){return d>0?100*n/d:null;}
