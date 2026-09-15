begin;
-- Extend cosmetic locations; gameplay and existing invitations remain unchanged.
alter table public.async_invitations drop constraint async_invitations_court_check;
alter table public.async_invitations add constraint async_invitations_court_check check (court in ('forest','venice','arizona'));
commit;
