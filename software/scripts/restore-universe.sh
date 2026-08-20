#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_TAR="${1:-}"
TARGET_DIR="${2:-}"

if [[ -z "$SNAPSHOT_TAR" || ! -f "$SNAPSHOT_TAR" || -z "$TARGET_DIR" ]]; then
  echo "Usage: bash scripts/restore-universe.sh <fichier_snapshot.tar.gz> <repertoire_destination>"
  echo "Exemple: bash scripts/restore-universe.sh /path/to/UNIV8_exp-001-pass_xxx.tar.gz /home/zaza/Bureau/REMOTE2"
  exit 1
fi

echo "[restore] Restauration du snapshot ${SNAPSHOT_TAR} vers ${TARGET_DIR}..."
mkdir -p "$TARGET_DIR"
tar -xzf "$SNAPSHOT_TAR" -C "$TARGET_DIR"
echo "[restore] OK — Univers restauré avec succès dans ${TARGET_DIR}."
