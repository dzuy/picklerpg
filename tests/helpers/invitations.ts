import type {InviteRepository,InviteRow} from '../../server/multiplayer/invitations';
import type {PgRepository} from './postgres';
export function pgInvitations(repo:PgRepository):InviteRepository{
 return {
 async list(actor){return (await repo.query('select * from async_invitations where $1 in (creator_id,recipient_id)',[actor])).rows as InviteRow[]},
 async get(id,actor){return (await repo.query('select * from async_invitations where id=$1 and $2 in (creator_id,recipient_id)',[id,actor])).rows[0]??null},
 async create(row){return (await repo.query('select create_async_invitation($1) as value',[row])).rows[0].value},
 async accept(id,actor,hash,match){return (await repo.query('select accept_async_invitation($1,$2,$3,$4) as value',[id,actor,hash,match])).rows[0].value},
 };
}
