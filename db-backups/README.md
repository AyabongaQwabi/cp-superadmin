# Database backups

Scripts to snapshot and restore the ClinicPlus MongoDB Atlas database(s).

## Setup

Requires the MongoDB Database Tools:

```bash
brew install mongodb-database-tools
```

Uses `DATABASE_URL`, `SELECTED_DB`, and `COMPANION_DB` from `../.env.local`.

## Backup

```bash
./backup.sh
```

Dumps each database into `dumps/<timestamp>/<db-name>/`, gzip-compressed,
and updates the `dumps/latest` symlink. Backups are gitignored — they are
not committed to the repo.

## Restore

```bash
./restore.sh                       # restore dumps/latest, merge into same db name
./restore.sh --from dumps/20260101-120000
./restore.sh --from dumps/latest --db some_other_db   # restore into a different db name
./restore.sh --from dumps/latest --drop               # drop collections first (true snapshot restore)
```

By default, restore **merges** documents into the existing database of the
same name (safe, non-destructive to other data). Pass `--drop` to first drop
each collection being restored, effectively resetting it to the snapshot.

Restoring always prompts for confirmation before touching the target
database.
