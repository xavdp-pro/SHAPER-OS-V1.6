#!/usr/bin/env bash
# ==============================================================================
# backup-pra-sync.sh — Réplication chiffrée AES-256 du backup vers le coffre PRA central
# Utilisation :
#   bash scripts/backup-pra-sync.sh [--pra-target <ssh_or_path>]
# ==============================================================================
set -euo pipefail

SHAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${SHAPER_DIR}/data/backups"
PRA_ENC_KEY="${PRA_ENCRYPTION_KEY:-${VAULT_MASTER_KEY:?Set PRA_ENCRYPTION_KEY or VAULT_MASTER_KEY}}"

# 1. Trouver la dernière sauvegarde locale
LATEST_BACKUP="$(ls -t "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null | head -n1 || true)"

if [[ -z "$LATEST_BACKUP" || ! -f "$LATEST_BACKUP" ]]; then
  echo "[backup-pra-sync] Aucune sauvegarde locale trouvée. Lancement d'un backup frais..."
  bash "${SHAPER_DIR}/scripts/backup-local.sh"
  LATEST_BACKUP="$(ls -t "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null | head -n1)"
fi

ENC_DEST="${LATEST_BACKUP}.enc"

echo "[backup-pra-sync] 🔐 Chiffrement AES-256 du snapshot pour le PRA central : ${LATEST_BACKUP}..."
openssl enc -aes-256-cbc -salt -pbkdf2 -in "$LATEST_BACKUP" -out "$ENC_DEST" -k "$PRA_ENC_KEY"

ENC_SIZE="$(du -h "$ENC_DEST" | cut -f1)"
echo "[backup-pra-sync] ✅ Snapshot chiffré prêt : ${ENC_DEST} (${ENC_SIZE})"

# 2. Synchronisation vers le coffre PRA distant (si configuré)
PRA_DEST_HOST="${PRA_DEST_HOST:-}"
if [[ -n "$PRA_DEST_HOST" ]]; then
  echo "[backup-pra-sync] 🚀 Envoi vers le coffre-fort PRA maître (${PRA_DEST_HOST})..."
  rsync -avz "$ENC_DEST" "${PRA_DEST_HOST}:/data/pra-vault/"
  echo "[backup-pra-sync] ✅ Snapshot répliqué avec succès dans le coffre PRA !"
else
  echo "[backup-pra-sync] Note : PRA_DEST_HOST non configuré (snapshot chiffré conservé localement dans data/backups/)."
fi

echo "{\"status\":\"ok\",\"service\":\"pra-sync-v1\",\"encryptedSnapshot\":\"${ENC_DEST}\",\"size\":\"${ENC_SIZE}\",\"timestamp\":\"$(date -Iseconds)\"}"
