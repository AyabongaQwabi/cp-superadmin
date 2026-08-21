# Environment Variables

Copy `.env.example` to `.env.local` and replace every placeholder before starting the dashboard.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB connection string for the analytics database. |
| `SELECTED_DB` | Yes | MongoDB database used by the dashboard. |
| `COMPANION_DB` | No | Companion database name. Defaults to `cp_companion`. |
| `COMPANION_API_URL` | No | Companion service URL. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_COMPANION_API_URL` | No | Public companion service URL fallback. |
| `ADMIN_STATS_SECRET` | No | Secret used when requesting companion statistics. |
| `AUTH_EMAIL` | Yes | Email accepted by the dashboard login page. |
| `AUTH_PASSWORD` | Yes | Password accepted by the dashboard login page. |
| `AUTH_SESSION_SECRET` | Yes | Random secret used to sign the login session cookie. |

`AUTH_PASSWORD` and `AUTH_SESSION_SECRET` must never be committed. The values in `.env.example` are placeholders only.