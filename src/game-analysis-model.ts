export interface LegacyGameAnalysisReport {
 headline:string;summary:string;story:string;turningPoint:string;weapons:string;opponents:string;rematchTip:string;
}
export interface CoachingPoint {title:string;detail:string;action:string}
export interface CoachingGameAnalysisReport {
 formatVersion:2;headline:string;summary:string;storyHeadline:string;storySubheadline:string;story:string;
 good:CoachingPoint[];improvements:CoachingPoint[];next:CoachingPoint[];
}
export type GameAnalysisReport=LegacyGameAnalysisReport|CoachingGameAnalysisReport;
export interface FullGameAnalysis {
 report:GameAnalysisReport;
 coverage:{complete:boolean;rallies:number;shots:number;fireballs:number};
 shotStats?:Array<{type:string;you:number;opponents:number}>;
}
