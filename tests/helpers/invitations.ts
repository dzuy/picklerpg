import type {InviteRepository,InviteRow} from '../../server/multiplayer/invitations';
import type {PgRepository} from './postgres';
export function pgInvitations(repo:PgRepository):InviteRepository{
 return {
 async rematch(source,actor,row){return (await repo.query('select create_async_rematch($1,$2,$3) as value',[source,actor,row])).rows[0].value},
 async close(id,actor,action){return (await repo.query('select close_async_invitation($1,$2,$3) as value',[id,actor,action])).rows[0].value},
 async list(actor){return (await repo.query("select * from async_invitations where (status='pending' and $1 in (creator_id,recipient_id)) or (status='declined' and creator_id=$1)",[actor])).rows as InviteRow[]},
 async get(id,actor){return (await repo.query('select * from async_invitations where id=$1 and $2 in (creator_id,recipient_id)',[id,actor])).rows[0]??null},
 async create(row){return (await repo.query('select create_async_invitation($1) as value',[row])).rows[0].value},
 async accept(id,actor,hash,match){return (await repo.query('select accept_async_invitation($1,$2,$3,$4) as value',[id,actor,hash,match])).rows[0].value},
 };
}
