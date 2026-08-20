#!/usr/bin/env node
/**
 * Bootstrap encrypted vault from resources/vault-resources.local.json
 * Sovereign REMOTE2 — plaintext resources live ONLY in resources/*.local.json (gitignored).
 *
 * Usage:
 *   node scripts/bootstrap-vault-from-resources.mjs
 *   VAULT_RESOURCES_FILE=./resources/vault-resources.local.json node scripts/bootstrap-vault-from-resources.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VaultStore } from '../packages/vault/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RESOURCES_FILE = process.env.VAULT_RESOURCES_FILE
  || path.join(ROOT, 'resources/vault-resources.local.json');

if (!fs.existsSync(RESOURCES_FILE)) {
  console.error(`[bootstrap-vault] Missing resources file: ${RESOURCES_FILE}`);
  console.error('Copy resources/vault-resources.example.json → resources/vault-resources.local.json');
  process.exit(1);
}

const resources = JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf8'));
const { vault, secrets } = resources;

if (!vault?.masterKey) {
  console.error('[bootstrap-vault] vault.masterKey is required in resources file');
  process.exit(1);
}

const storageFile = path.resolve(ROOT, vault.storageFile || 'data/vault/vault.enc');
fs.mkdirSync(path.dirname(storageFile), { recursive: true });

const store = new VaultStore({ masterKey: vault.masterKey, storageFile });
let count = 0;

for (const [key, payload] of Object.entries(secrets || {})) {
  store.setSecret(key, payload);
  count++;
}

// Optional: write .env pointers (no secret values duplicated if already in resources)
const envPath = path.join(ROOT, '.env');
const envLines = [
  `VAULT_MASTER_KEY=${vault.masterKey}`,
  `VAULT_TOKEN=${vault.token || ''}`,
  `VAULT_STORAGE_FILE=${vault.storageFile || 'data/vault/vault.enc'}`,
  `BRIDGE_AGY_STUB=1`,
];
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envLines.join('\n') + '\n', { mode: 0o600 });
  console.log(`[bootstrap-vault] Created ${envPath} (vault pointers only)`);
}

console.log(`[bootstrap-vault] OK — ${count} secret(s) → ${storageFile}`);
