import {isCourtTheme,themeOptions,FUN_THEMES,type CourtTheme} from './fun-themes';
import {premiumForPlay} from './premium';
import {ownsPack} from './pack-catalog';
import {showViewDialog} from './view-focus';
import './fun-theme-control.css';
/** Setup-only choice. No roster mutation; callers apply accepted match overrides. */
export class FunThemeControl {
 readonly element=document.createElement('div');
 value:CourtTheme='none';private select=document.createElement('select');private dialog:HTMLDialogElement|null=null;
 constructor(private changed:(theme:CourtTheme)=>void,private applyPlayers:(theme:CourtTheme)=>void,private undoPlayers:()=>void){
  this.element.className='fun-theme-control';this.element.hidden=true;const label=document.createElement('label');label.textContent='Theme';this.select.innerHTML=themeOptions();label.append(this.select);this.element.append(label);
  const undo=document.createElement('button');undo.type='button';undo.textContent='Undo player theme';undo.hidden=true;undo.onclick=()=>{undoPlayers();undo.hidden=true};this.element.append(undo);
  this.select.onchange=()=>{const next=this.select.value;if(!isCourtTheme(next)||next===this.value)return;this.value=next;changed(next);if(next==='none')return;
   this.dialog?.close();const dialog=document.createElement('dialog');this.dialog=dialog;dialog.className='fun-theme-prompt';const heading=document.createElement('h2');heading.textContent=`Use ${FUN_THEMES.find(t=>t.id===next)!.name} for your players too?`;const copy=document.createElement('p');copy.textContent='Apply matching looks to your team for this match. Your saved players stay the same.';
   const yes=document.createElement('button'),no=document.createElement('button');yes.type=no.type='button';yes.textContent='Apply theme';no.textContent='Keep current looks';yes.onclick=()=>{this.applyPlayers(next);undo.hidden=false;dialog.close()};no.onclick=()=>dialog.close();dialog.append(heading,copy,yes,no);dialog.onclose=()=>{dialog.remove();if(this.dialog===dialog)this.dialog=null};document.body.append(dialog);showViewDialog(dialog);
  };void this.refresh();
 }
 async refresh(){try{const s=await premiumForPlay();this.element.hidden=s.enforced&&!ownsPack(s.ownedPacks,'fun');if(this.element.hidden){this.value='none';this.select.value='none';this.changed('none');this.undoPlayers();}}catch{this.element.hidden=true;this.value='none';this.select.value='none';this.changed('none');this.undoPlayers();}}
}
