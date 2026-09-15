begin;
-- Cosmetic location only; the same match engine and court dimensions serve both.
alter table public.async_invitations drop constraint async_invitations_court_check;
alter table public.async_invitations add constraint async_invitations_court_check check (court in ('forest','venice'));
commit;
