import config from './xp-config.json';
import {authClient} from './auth-session';
export async function accountSkillBudget(){const client=authClient();if(!client)return config.STARTING_SKILL_BUDGET;const {data,error}=await client.rpc('my_skill_budget');if(error)throw new Error('Could not load your skill budget. Reconnect to allocate earned points.');return Math.max(config.STARTING_SKILL_BUDGET,Number(data)||config.STARTING_SKILL_BUDGET);}
