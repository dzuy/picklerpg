import type {PlayerId,Team} from './model';
export const TEAMS:Record<Team,PlayerId[]>={home:['you','partner'],away:['opponent-left','opponent-right']};
export const other=(team:Team):Team=>team==='home'?'away':'home';
export class DoublesScore {
 score:Record<Team,number>={home:0,away:0};serving:Team='home';server:PlayerId='you';serverNumber:1|2=2;winner:Team|null=null;
 right:Record<Team,PlayerId>={home:'you',away:'opponent-left'};
 get call(){return `${this.score[this.serving]}–${this.score[other(this.serving)]}–${this.serverNumber}`}
 award(winner:Team){
  if(this.winner)throw new Error('Game already complete.');
  if(winner===this.serving){this.score[winner]++;this.right[winner]=TEAMS[winner].find(id=>id!==this.right[winner])!;
   if(this.score[winner]>=11&&this.score[winner]-this.score[other(winner)]>=2)this.winner=winner;
  }else if(this.serverNumber===1){this.serverNumber=2;this.server=TEAMS[this.serving].find(id=>id!==this.server)!}
  else{this.serving=other(this.serving);this.serverNumber=1;this.server=this.right[this.serving]}
 }
}
