import type {PlayerId,Team} from './model';
export const TEAMS:Record<Team,PlayerId[]>={home:['you','partner'],away:['opponent-left','opponent-right']};
export const other=(team:Team):Team=>team==='home'?'away':'home';
export type ScoringMode='side-out-doubles'|'rally-doubles';
export interface ScoringRules {scoring:ScoringMode;target:number;winBy:number}
export const DEFAULT_RULES:ScoringRules={scoring:'side-out-doubles',target:11,winBy:2};
export const LOCAL_TEST_RULES:ScoringRules={scoring:'rally-doubles',target:3,winBy:1};
export function isValidTargetScore(value:number){return Number.isSafeInteger(value)&&value>=1&&value<=99;}
export class DoublesScore {
 constructor(public rules:ScoringRules={...DEFAULT_RULES}){if(rules.scoring==='rally-doubles')this.serverNumber=1;}
 score:Record<Team,number>={home:0,away:0};serving:Team='home';server:PlayerId='you';serverNumber:1|2=2;winner:Team|null=null;
 right:Record<Team,PlayerId>={home:'you',away:'opponent-left'};
 get call(){return `${this.score[this.serving]}–${this.score[other(this.serving)]}${this.rules.scoring==='rally-doubles'?'':`–${this.serverNumber}`}`}
 award(winner:Team){
  if(this.winner)throw new Error('Game already complete.');
  if(this.rules.scoring==='rally-doubles'){
   this.score[winner]++;
   // Both serving and receiving points change the winner's score parity.
   this.right[winner]=TEAMS[winner].find(id=>id!==this.right[winner])!;
   if(winner!==this.serving){this.serving=winner;this.server=this.right[winner];}
   this.serverNumber=1;
   if(this.score[winner]>=this.rules.target&&this.score[winner]-this.score[other(winner)]>=this.rules.winBy)this.winner=winner;
   return;
  }
  if(winner===this.serving){this.score[winner]++;this.right[winner]=TEAMS[winner].find(id=>id!==this.right[winner])!;
   if(this.score[winner]>=this.rules.target&&this.score[winner]-this.score[other(winner)]>=this.rules.winBy)this.winner=winner;
  }else if(this.serverNumber===1){this.serverNumber=2;this.server=TEAMS[this.serving].find(id=>id!==this.server)!}
  else{this.serving=other(this.serving);this.serverNumber=1;this.server=this.right[this.serving]}
 }
}
