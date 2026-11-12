begin;
-- Deliberately closed until verified upload manifests and server canonical report finalisation exist.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cleanproof-private','cleanproof-private',false,10485760,array['image/jpeg','application/pdf'])
on conflict(id) do nothing;
-- No authenticated object policies are granted by this increment. Membership alone must not
-- grant arbitrary path uploads/downloads, overwrites or deletion of immutable evidence.
commit;
