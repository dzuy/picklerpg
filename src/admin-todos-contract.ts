export const TODO_GROUPS={next:'Next fixes',acceptance:'Acceptance checks',later:'Later ideas',deferred:'Deferred / archived'} as const;
export type TodoGroup=keyof typeof TODO_GROUPS;
export interface AdminTodo {id:string;title:string;notes:string;group:TodoGroup;done:boolean}
export interface AdminTodoList {version:number;items:AdminTodo[]}
export type TodoAction={action:'add'|'edit';version:number;item:AdminTodo}|{action:'delete';version:number;id:string};
