/** Screen transitions announce a surface without selecting one of its actions. */
export function focusView(surface?:HTMLElement){
 const target=surface??Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1)??document.body;
 target.tabIndex=-1;
 target.classList.add('view-focus-target');
 target.focus({preventScroll:true});
}

/** Avoid the browser's implicit focus on a dialog's first button. */
export function showViewDialog(dialog:HTMLDialogElement){
 dialog.showModal();
 focusView(dialog);
 dialog.addEventListener('close',()=>focusView(),{once:true});
}
