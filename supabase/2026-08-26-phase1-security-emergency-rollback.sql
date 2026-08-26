-- Emergency rollback only. This restores the insecure legacy policies long enough
-- to recover service if both protected server deployments unexpectedly fail.
begin;

grant all privileges on table public.buyer_signups to anon, authenticated;
grant all privileges on table public.deal_leads to anon, authenticated;
grant all privileges on table public.deal_views to anon, authenticated;
grant all privileges on table public.deals to anon, authenticated;
grant all privileges on table public.property_chats to anon, authenticated;

create policy "Allow public inserts" on public.buyer_signups for insert to anon with check (true);
create policy "Allow public reads" on public.buyer_signups for select to anon using (true);
create policy "Allow anonymous lead inserts" on public.deal_leads for insert to anon with check (true);
create policy "Allow anonymous lead reads" on public.deal_leads for select to anon using (true);
create policy "Allow anonymous inserts" on public.deal_views for insert to anon with check (true);
create policy "Allow anonymous reads" on public.deal_views for select to anon using (true);
create policy "Allow all" on public.deals for all to public using (true);
create policy "Allow anonymous deletes on deals" on public.deals for delete to anon using (true);
create policy "Allow anonymous inserts on deals" on public.deals for insert to anon with check (true);
create policy "Allow anonymous reads on deals" on public.deals for select to anon using (true);
create policy "Allow anonymous updates" on public.deals for update to anon using (true) with check (true);
create policy "Allow all" on public.property_chats for all to public using (true);

create policy "Give anon users access to JPG images in folder 17hsb9e_0"
on storage.objects for select to public using (bucket_id = 'deal-photos');
create policy "Give anon users access to JPG images in folder 17hsb9e_1"
on storage.objects for insert to public with check (bucket_id = 'deal-photos');

update storage.buckets
set file_size_limit = null,
    allowed_mime_types = null
where id = 'deal-photos';

commit;
