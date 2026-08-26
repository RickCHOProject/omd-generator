# OMD Deal Package Generator

Internal Off Market Daily tool for creating buyer deal pages, managing live deals, and reviewing engagement. Buyer-facing pages under `/d/[slug]` stay public. The generator at `/` and dashboard at `/admin` require an individually approved Supabase account.

## Production login setup

Configure these values in Vercel before enabling the protected build:

- `OMD_OWNER_EMAIL`: the permanent Owner account (`rick@cactushomeoffer.com`)
- `NEXT_PUBLIC_SUPABASE_URL`: the OMD Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the public Supabase browser/session key
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key for protected internal routes

Supabase handles secure sessions, invitations, and password recovery. The Owner can invite or deactivate staff from **Admin → Team Access**. Existing Supabase users are denied unless they are the configured Owner or explicitly carry active OMD staff access. Individual sessions allow new deals and edits to record the responsible staff member. Never commit actual passwords or the service-role key.

Deals are archived from the admin instead of deleted. Archived buyer pages stop displaying publicly, while the record remains available to the Owner for restoration. Permanent deletion is restricted to the Owner API and is intentionally absent from the normal interface.
