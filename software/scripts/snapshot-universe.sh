#!/usr/bin/env bash
set -euo pipefail

UNIV_DIR="${1:-}"
SNAPSHOT_TAG="${2:-checkpoint}"

if [[ -z "$UNIV_DIR" || ! -d "$UNIV_DIR" ]]; then
  echo "Usage: bash scripts/snapshot-universe.sh <chemin_univers> [tag]"
  echo "Exemple: bash scripts/snapshot-universe.sh /home/zaza/Bureau/REMOTE2/UNIV8 exp-001-pass"
  exit 1
fi

UNIV_NAME="$(basename "$UNIV_DIR")"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SNAPSHOT_FILE="${UNIV_DIR}/sav/snapshots/${UNIV_NAME}_${SNAPSHOT_TAG}_${TIMESTAMP}.tar.gz"

mkdir -p "${UNIV_DIR}/sav/snapshots"

echo "[snapshot] Création du snapshot pour ${UNIV_NAME} (tag: ${SNAPSHOT_TAG})..."

# 1. Dump MariaDB si disponible
if command -v mariadb-dump >/dev/null 2>&1 || command -v mysqldump >/dev/null 2>&1; then
  DUMP_CMD="mysqldump"
  command -v mariadb-dump >/dev/null 2>&1 && DUMP_CMD="mariadb-dump"
  mkdir -p "${UNIV_DIR}/sav/db"
  $DUMP_CMD -u root --all-databases 2>/dev/null > "${UNIV_DIR}/sav/db/dump_auto_${TIMESTAMP}.sql" || true
fi

# 2. Archive de l'état complet
tar --exclude='sav/snapshots' \
    --exclude='node_modules' \
    --exclude='.git' \
    -czf "$SNAPSHOT_FILE" \
    -C "$(dirname "$UNIV_DIR")" \
    "$UNIV_NAME"

echo "[snapshot] OK — Snapshot sauvegardé dans :"
echo "  -> $SNAPSHOT_FILE"
