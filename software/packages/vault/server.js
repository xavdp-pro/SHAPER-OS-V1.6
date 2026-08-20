#!/usr/bin/env node
/**
 * @file server.js
 * @package @shaper/vault-engine
 * @description Point d'entrée standalone / conteneur pour le daemon Vault v1.
 */

import { createVaultServer } from './index.js';

const PORT = parseInt(process.env.PORT || process.env.VAULT_PORT || '8510', 10);
const HOST = process.env.HOST || process.env.VAULT_HOST || '0.0.0.0';
const MASTER_KEY = process.env.VAULT_MASTER_KEY || process.env.VAULT_ENCRYPTION_KEY || 'default-gbs-vault-master-key-change-in-prod';
const VAULT_TOKEN = process.env.VAULT_TOKEN || null;
const STORAGE_FILE = process.env.VAULT_STORAGE_FILE || '/storage/vault-data.json';

console.log(`[vault-v1] Starting Vault Engine on ${HOST}:${PORT}...`);
console.log(`[vault-v1] Storage: ${STORAGE_FILE}`);
console.log(`[vault-v1] Token Auth: ${VAULT_TOKEN ? 'ENABLED' : 'DISABLED (open localhost)'}`);

const server = createVaultServer({
  port: PORT,
  host: HOST,
  masterKey: MASTER_KEY,
  vaultToken: VAULT_TOKEN,
  storageFile: STORAGE_FILE
});

server.on('listening', () => {
  console.log(`[vault-v1] Ready and listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[vault-v1] Received SIGTERM, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[vault-v1] Received SIGINT, shutting down...');
  server.close(() => process.exit(0));
});
