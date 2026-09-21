import {authClient} from './auth-session';
export async function accountSkillBudget(){const client=authClient();if(!client)return 35;const {data,error}=await client.rpc('my_skill_budget');if(error)throw new Error('Could not load your skill budget. Reconnect to allocate earned points.');return Math.max(35,Math.min(45,Number(data)||35));}
