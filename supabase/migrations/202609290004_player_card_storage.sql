-- Only card artwork is public. Uploads go through the server's bounded, rate-limited endpoint.
-- No anon/authenticated INSERT, UPDATE, SELECT-listing or DELETE policies are granted.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('player-cards','player-cards',true,4194304,array['image/png'])
on conflict(id) do nothing;
