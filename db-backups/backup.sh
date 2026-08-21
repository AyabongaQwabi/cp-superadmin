#!/usr/bin/env bash
# Dumps the MongoDB Atlas database(s) used by ClinicPlus to a timestamped
# folder under db-backups/dumps/. Reads DATABASE_URL / SELECTED_DB (and
# optionally COMPANION_DB) from .env.local in this directory's project root.
#
# Usage:
#   ./backup.sh                 # dump SELECTED_DB (and COMPANION_DB if set)
#   ./backup.sh --db mydb       # dump a specific db name instead
#   ./backup.sh --all           # dump every non-system database on the cluster
#   ./backup.sh --uri "mongodb+srv://..." --db mydb
#
# Requires: mongodump (brew install mongodb-database-tools)
# --all additionally requires: mongosh (brew install mongosh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMPS_DIR="$SCRIPT_DIR/dumps"

ENV_FILE="$PROJECT_ROOT/.env.local"
read_env_var() {
  # Reads KEY=value from ENV_FILE without shell-sourcing it, since values
  # (e.g. mongodb+srv URIs) may contain &, ?, $ etc. that break `source`.
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n1
}

URI="${DATABASE_URL:-$(read_env_var DATABASE_URL)}"
SELECTED_DB="${SELECTED_DB:-$(read_env_var SELECTED_DB)}"
COMPANION_DB="${COMPANION_DB:-$(read_env_var COMPANION_DB)}"
DBS=()
ALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uri)
      URI="$2"; shift 2 ;;
    --db)
      DBS+=("$2"); shift 2 ;;
    --all)
      ALL=1; shift ;;
    *)
      echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$URI" ]]; then
  echo "Error: DATABASE_URL not set (checked $ENV_FILE and --uri flag)." >&2
  exit 1
fi

if [[ "$ALL" -eq 1 ]]; then
  if ! command -v mongosh >/dev/null 2>&1; then
    echo "Error: mongosh not found (required for --all). Install with: brew install mongosh" >&2
    exit 1
  fi
  echo "Discovering databases on cluster..."
  mapfile -t DBS < <(mongosh "$URI" --quiet --eval \
    "db.adminCommand('listDatabases').databases.map(d => d.name).filter(n => n !== 'admin' && n !== 'local' && n !== 'config').join('\n')")
  echo "Found: ${DBS[*]}"
elif [[ ${#DBS[@]} -eq 0 ]]; then
  [[ -n "${SELECTED_DB:-}" ]] && DBS+=("$SELECTED_DB")
  [[ -n "${COMPANION_DB:-}" ]] && DBS+=("$COMPANION_DB")
fi

if [[ ${#DBS[@]} -eq 0 ]]; then
  echo "Error: no database name found. Set SELECTED_DB in .env.local or pass --db <name>." >&2
  exit 1
fi

if ! command -v mongodump >/dev/null 2>&1; then
  echo "Error: mongodump not found. Install with: brew install mongodb-database-tools" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$DUMPS_DIR/$TIMESTAMP"
mkdir -p "$OUT_DIR"

for DB in "${DBS[@]}"; do
  echo "Backing up database '$DB' -> $OUT_DIR/$DB"
  mongodump --uri "$URI" --db "$DB" --out "$OUT_DIR" --gzip
done

# Keep a convenience symlink to the most recent backup.
ln -sfn "$OUT_DIR" "$DUMPS_DIR/latest"

echo ""
echo "Backup complete: $OUT_DIR"
echo "Restore with: ./restore.sh --from $OUT_DIR"
