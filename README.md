# OMD Deal Package Generator

Internal Off Market Daily tool for creating buyer deal pages, managing live deals, and reviewing engagement. Buyer-facing pages under `/d/[slug]` stay public. The generator at `/` and dashboard at `/admin` require the shared staff login.

## Production login setup

Configure these values in Vercel before enabling the protected build:

- `OMD_STAFF_USERS_JSON`: JSON object with one username, display name, and password hash per staff member
- `OMD_LOGIN_USERNAME` and `OMD_LOGIN_PASSWORD_SHA256`: optional fallback for the earlier shared login
- `OMD_SESSION_SECRET`: unique random value of at least 32 characters
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase key for protected internal routes

Sessions last 12 hours and use a secure, HTTP-only cookie. Individual sessions allow new deals and edits to record the responsible staff member. Never commit actual passwords or the service-role key.
