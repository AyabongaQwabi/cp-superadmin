#!/usr/bin/env bash
# Restores a MongoDB backup created by backup.sh.
#
# By default this restores into the SAME database name the dump was taken
# from (safe: it does NOT touch other databases). Existing collections are
# left in place and merged into unless --drop is passed, which drops each
# collection before restoring it -- use --drop for a true "restore to
# snapshot" instead of a merge.
#
# Usage:
#   ./restore.sh                          # restore db-backups/dumps/latest
#   ./restore.sh --from dumps/20260101-120000
#   ./restore.sh --from dumps/latest --db some_other_db_name
#   ./restore.sh --from dumps/latest --drop
#   ./restore.sh --uri "mongodb+srv://..." --from dumps/latest
#
# Requires: mongorestore (brew install mongodb-database-tools)

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
FROM="$DUMPS_DIR/latest"
TARGET_DB=""
DROP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uri)
      URI="$2"; shift 2 ;;
    --from)
      FROM="$2"; shift 2 ;;
    --db)
      TARGET_DB="$2"; shift 2 ;;
    --drop)
      DROP=1; shift ;;
    *)
      echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$URI" ]]; then
  echo "Error: DATABASE_URL not set (checked $ENV_FILE and --uri flag)." >&2
  exit 1
fi

if [[ ! -d "$FROM" ]]; then
  echo "Error: backup folder not found: $FROM" >&2
  exit 1
fi

if ! command -v mongorestore >/dev/null 2>&1; then
  echo "Error: mongorestore not found. Install with: brew install mongodb-database-tools" >&2
  exit 1
fi

# Each dumped database is a subfolder of $FROM (e.g. dumps/20260101/production).
mapfile -t DB_FOLDERS < <(find "$FROM" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#DB_FOLDERS[@]} -eq 0 ]]; then
  echo "Error: no database folders found inside $FROM" >&2
  exit 1
fi

echo "About to restore into: $URI"
echo "Source: $FROM"
[[ -n "$TARGET_DB" ]] && echo "Target db override: $TARGET_DB"
[[ "$DROP" -eq 1 ]] && echo "Mode: DROP existing collections before restore"
read -r -p "Continue? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

for DB_FOLDER in "${DB_FOLDERS[@]}"; do
  SRC_DB_NAME="$(basename "$DB_FOLDER")"
  DEST_DB_NAME="${TARGET_DB:-$SRC_DB_NAME}"

  ARGS=(--uri "$URI" --gzip --nsFrom "${SRC_DB_NAME}.*" --nsTo "${DEST_DB_NAME}.*" "$FROM")
  if [[ "$DROP" -eq 1 ]]; then
    ARGS=(--drop "${ARGS[@]}")
  fi

  echo "Restoring '$SRC_DB_NAME' -> '$DEST_DB_NAME'"
  mongorestore "${ARGS[@]}"
done

echo ""
echo "Restore complete."
