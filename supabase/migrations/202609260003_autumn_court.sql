-- Enable Autumn Park for new multiplayer invitations.
alter table public.async_invitations drop constraint async_invitations_court_check;
alter table public.async_invitations add constraint async_invitations_court_check
 check (court in ('forest','venice','arizona','city','glowball','jungle','winter','autumn'));
