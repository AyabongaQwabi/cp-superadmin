# Environment Variables

Copy `.env.example` to `.env.local` and replace every placeholder before starting the dashboard.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB connection string for the ClinicPlus production cluster. |
| `SELECTED_DB` | Yes | ClinicPlus production database used for admin authentication and operational reads. |
| `COMPANION_DB` | No | Derived operational read-model database. Defaults to `cp_companion`. |
| `ADMIN_COMPANION_DB` | No | Clinicplus Admin Companion analytics/subscription database. Defaults to `clinicplus_admin_companion`. |
| `ADMIN_COMPANION_BASE_URL` | No | Public base URL used for Yoco success/cancel/failure redirects. |
| `COMPANION_API_URL` | No | Internal platform admin API URL. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_COMPANION_API_URL` | No | Public fallback for the internal platform admin API URL. |
| `ADMIN_STATS_SECRET` | No | Secret used when requesting guarded admin operations. |
| `AUTH_SESSION_SECRET` | Yes | Random secret used to sign the login session cookie. |

Clinicplus Admin Companion validates `role: "admin"` and `role: "superadmin"` users against `SELECTED_DB.users` using the production password hash. `AUTH_SESSION_SECRET` must never be committed. The values in `.env.example` are placeholders only.
