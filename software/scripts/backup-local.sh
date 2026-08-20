#!/usr/bin/env bash
# ==============================================================================
# backup-local.sh — Sauvegarde locale quotidienne souveraine (/data/backups/)
# Effectue un snapshot complet des données persistantes :
# - MariaDB SQL Dump
# - Mini-GED (/data/ged)
# - Vault (/data/vault)
# - Logger (/data/logger)
# ==============================================================================
set -euo pipefail

SHAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${SHAPER_DIR}/data/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
SNAPSHOT_NAME="backup_${TIMESTAMP}"
DEST_TAR="${BACKUP_DIR}/${SNAPSHOT_NAME}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup-local] 📦 Démarrage de la sauvegarde locale : ${SNAPSHOT_NAME}..."

# 1. Dump MariaDB
DUMP_DIR="${SHAPER_DIR}/data/_staging_dump"
mkdir -p "$DUMP_DIR"
if command -v mariadb-dump &>/dev/null; then
  mariadb-dump -h 127.0.0.1 -u helm_user -phelm_password_local helm_db > "${DUMP_DIR}/helm_db.sql" 2>/dev/null || true
elif podman exec univ9-helm mariadb-dump -u helm_user -phelm_password_local helm_db > "${DUMP_DIR}/helm_db.sql" 2>/dev/null; then
  echo "[backup-local] Dump MariaDB extrait avec succès via Podman."
else
  echo "[backup-local] Note : MariaDB dump non disponible directement."
fi

# 2. Archive complète des données (/data et /root/SHAPER-OS/data)
cd "$SHAPER_DIR"
tar -czf "$DEST_TAR" \
  --exclude="data/backups" \
  --exclude="*.tmp" \
  --exclude="node_modules" \
  -C "$SHAPER_DIR" \
  data/ \
  ${SHAPER_DIR}/.env \
  ${SHAPER_DIR}/topology.json \
  2>/dev/null || true

rm -rf "$DUMP_DIR"

SIZE="$(du -h "$DEST_TAR" | cut -f1)"
SHA256="$(sha256sum "$DEST_TAR" | awk '{print $1}')"
echo "[backup-local] ✅ Sauvegarde créée : ${DEST_TAR} (${SIZE}) SHA256: ${SHA256}"

# 3. Rotation des 7 derniers jours
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
echo "[backup-local] 🧹 Rotation effectuée (conservation 7 jours)."

echo "{\"status\":\"ok\",\"snapshot\":\"${SNAPSHOT_NAME}\",\"path\":\"${DEST_TAR}\",\"size\":\"${SIZE}\",\"timestamp\":\"$(date -Iseconds)\"}"
