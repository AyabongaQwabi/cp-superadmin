# ClinicPlus Analytics Dashboard

A read-only Next.js business analytics dashboard for ClinicPlus, built directly on top of the
production MongoDB database used by `clinicplus-server-latest-stable-version`. It never talks to
that server's Express/Socket.IO API — it reads the database directly, with plain aggregation
pipelines.

See `../ANALYTICS_INVENTORY.md`, `../PHASE_1B_REAL_DATA_VERIFICATION.md`, and
`../PHASE_1C_PAYMENT_MODEL_RESOLVED.md` for the full write-up of the data model, the business
rules this dashboard encodes, and the data-quality caveats that shape every number shown here.
The in-app "Methodology & data caveats" panel on the overview page is a condensed version of the
same.

## What this shows

- Business-wide totals: appointments booked, approved (= paid), declined, pending, revenue
  collected/outstanding/lost.
- Year-over-year volume and revenue trends across the full history in the database
  (Dec 2022–present).
- Monthly volume for the last ~3 years.
- Breakdown by clinic (`Churchill` / `Hendrina`).
- Breakdown by company — ranked by revenue collected, with decline rate as a reliability signal.
- Breakdown by ClinicPlus admin user (there is no separate "staff" role in this system's data —
  see the Methodology panel).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env.local` and fill in a MongoDB connection string:

   ```bash
   cp .env.example .env.local
   ```

   ```
   DATABASE_URL=mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority
   SELECTED_DB=production
   ```

   **Strongly recommended:** point this at a **read-only** database user or a read replica, not
   a credential with write access. This app issues no write operations anywhere in its code, but
   defense in depth is cheap — an aggregation-only, read-only Mongo user removes any risk of this
   reporting tool ever touching production data, even accidentally.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. **Production build** (optional, to verify before deploying)

   ```bash
   npm run build && npm run start
   ```

## Architecture

- **Next.js App Router, all Server Components.** Every page (`app/page.tsx`,
  `app/companies/page.tsx`, `app/employees/page.tsx`) fetches its data directly on the server via
  MongoDB aggregation pipelines — no client-side data fetching, no REST/Socket.IO calls to the
  existing server.
- **`lib/mongodb.ts`** — a singleton MongoDB client connection (reused across hot-reloads in dev).
- **`lib/aggregations.ts`** — the aggregation pipelines. Everything is built on one shared
  building block, `unionedAppointmentsPipeline()`, which:
  - Unions the live `appointments` collection with `deleted_appointments` (~25% of all
    appointments ever created are soft-deleted — see the inventory doc), deduped by `id`,
    preferring the live copy's field values when an id exists in both.
  - Derives `_year`/`_month` from `tracking[0].date` (the only reliable date field —
    `details.date` is placeholder/corrupted in >99% of records).
  - Normalizes `status`/`payment.amount` with `$ifNull` defaults.
  - Deliberately **excludes** a fourth `archive` database found during Phase 1 — its overlap with
    `appointments`/`deleted_appointments` for 2023 was not resolved with confidence, and
    including it risked double-counting that year.
- **`lib/cached.ts`** — wraps every aggregation in `unstable_cache` with a 1-hour revalidation
  window, since this is historical data that doesn't need to be recomputed on every request.
- **`components/`** — chart components (Recharts) and a shared `SegmentTable` for
  company/clinic/employee breakdowns, styled with a colorblind-safe palette (validated per the
  `dataviz` design guidance) that adapts to light/dark mode.

### A note on `allowDiskUse` and `$unionWith`

Every aggregation passes `{ allowDiskUse: true }`. During development, a `$group` stage that
tried to dedupe the live+deleted union via a `$sort` + `$top`/`$$ROOT` accumulator reliably hit
MongoDB's 32MB in-memory limit **and ignored `allowDiskUse`** when placed after `$unionWith` on
this cluster — confirmed by isolating each pipeline stage against the real data. The working
dedup instead groups on `id` with per-field `$first` accumulators (relying on `$unionWith`
preserving encounter order — live collection first — so `$first` naturally prefers the live
copy), which avoids the problematic accumulator entirely. If you extend these pipelines, be aware
of this constraint: prefer `$first`/`$min`/`$max`/`$sum` accumulators over `$top`/`$bottom` or a
`$sort` right after a `$unionWith` stage on a large union.

## What's intentionally not here

- No write path of any kind — this app cannot insert/update/delete/drop anything in MongoDB.
- No `archive` database data (see above) — flagged, not silently included.
- No X-ray/service-level or per-appointment employee-headcount breakdown — `details.employees` on
  an appointment is the client company's own workforce being serviced, not ClinicPlus staff (see
  the inventory doc's schema correction); it wasn't in scope for this pass but the aggregation
  layer could be extended to cover it if useful.
