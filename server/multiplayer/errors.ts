export class ApiError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
export const conflict=()=>new ApiError(409,'conflict','This match changed. Refresh before choosing another shot.');
export const missing=()=>new ApiError(404,'not_found','Match not found.');
