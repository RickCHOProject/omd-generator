select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('deals', 'buyer_signups', 'deal_leads', 'deal_views', 'property_chats'))
   or (schemaname = 'storage' and tablename = 'objects' and (qual like '%deal-photos%' or with_check like '%deal-photos%'))
order by schemaname, tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('deals', 'buyer_signups', 'deal_leads', 'deal_views', 'property_chats')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'deal-photos';
