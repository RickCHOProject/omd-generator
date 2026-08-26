begin;

drop policy if exists "Allow public inserts" on public.buyer_signups;
drop policy if exists "Allow public reads" on public.buyer_signups;
drop policy if exists "Allow anonymous lead inserts" on public.deal_leads;
drop policy if exists "Allow anonymous lead reads" on public.deal_leads;
drop policy if exists "Allow anonymous inserts" on public.deal_views;
drop policy if exists "Allow anonymous reads" on public.deal_views;
drop policy if exists "Allow all" on public.deals;
drop policy if exists "Allow anonymous deletes on deals" on public.deals;
drop policy if exists "Allow anonymous inserts on deals" on public.deals;
drop policy if exists "Allow anonymous reads on deals" on public.deals;
drop policy if exists "Allow anonymous updates" on public.deals;
drop policy if exists "Allow all" on public.property_chats;

revoke all privileges on table public.buyer_signups from anon, authenticated;
revoke all privileges on table public.deal_leads from anon, authenticated;
revoke all privileges on table public.deal_views from anon, authenticated;
revoke all privileges on table public.deals from anon, authenticated;
revoke all privileges on table public.property_chats from anon, authenticated;

drop policy if exists "Give anon users access to JPG images in folder 17hsb9e_0" on storage.objects;
drop policy if exists "Give anon users access to JPG images in folder 17hsb9e_1" on storage.objects;

update storage.buckets
set file_size_limit = 12582912,
    allowed_mime_types = array['image/jpeg']::text[]
where id = 'deal-photos';

commit;
