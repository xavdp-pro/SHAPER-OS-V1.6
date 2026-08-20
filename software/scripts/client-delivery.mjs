#!/usr/bin/env node
/**
 * @file client-delivery.mjs
 * @description Générateur de livraison d'univers client Shaper OS de production.
 * Prépare une instance client dupliquée, souveraine, avec son dépôt Git dédié,
 * ses backups locaux et sa clé de réplication PRA.
 *
 * Utilisation :
 *   node scripts/client-delivery.mjs create --slug <slug> --client "<Nom Client>" --domain "<domain>" [--git-remote <url>]
 *
 * Exemple :
 *   node scripts/client-delivery.mjs create --slug dupont --client "Cabinet Dupont" --domain "ia.dupont.fr" --git-remote "git@github.com:dupont/shaper-os.git"
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(args) {
  const parsed = {
    command: args[0] || 'help',
    slug: '',
    client: '',
    domain: '',
    gitRemote: '',
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--slug' && args[i + 1]) parsed.slug = args[++i].toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (args[i] === '--client' && args[i + 1]) parsed.client = args[++i];
    if (args[i] === '--domain' && args[i + 1]) parsed.domain = args[++i];
    if (args[i] === '--git-remote' && args[i + 1]) parsed.gitRemote = args[++i];
  }

  return parsed;
}

function deliverClientUniverse(options) {
  const { slug, client, domain, gitRemote } = options;
  if (!slug || !client) {
    console.error('❌ Erreur : les paramètres --slug et --client sont obligatoires.');
    process.exit(1);
  }

  const univDir = path.join(ROOT_DIR, `universes/univ-${slug}`);
  const deployDir = path.join(univDir, 'deploy');
  const contextDir = path.join(univDir, 'context');
  const logDir = path.join(univDir, 'log');
  const savDir = path.join(univDir, 'sav');

  console.log(`\n🚀 [Client Delivery Engine] Préparation de l'instance client : ${client} (${slug})...`);

  fs.mkdirSync(deployDir, { recursive: true });
  fs.mkdirSync(contextDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  fs.mkdirSync(savDir, { recursive: true });

  const vaultToken = `vault-token-${slug}-${crypto.randomBytes(8).toString('hex')}`;
  const jwtSecret = `jwt-secret-${slug}-${crypto.randomBytes(12).toString('hex')}`;
  const masterKey = `shaper-${slug}-master-${crypto.randomBytes(16).toString('hex')}`;

  // 1. Client Environment file
  const envContent = `# Configuration de production Shaper OS pour ${client}
CLIENT_NAME="${client}"
CLIENT_SLUG="${slug}"
DOMAIN="${domain || `ia.${slug}.fr`}"
VAULT_MASTER_KEY="${masterKey}"
VAULT_TOKEN="${vaultToken}"
JWT_SECRET="${jwtSecret}"
GIT_REMOTE="${gitRemote || ''}"
PRA_DEST_HOST="pra-vault.shaper-os.net"
`;
  fs.writeFileSync(path.join(deployDir, `${slug}.env`), envContent);

  // 2. Client Manifest
  const manifest = {
    universe: `univ-${slug}`,
    clientName: client,
    domain: domain || `ia.${slug}.fr`,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
    gitRemote: gitRemote || 'local-repo',
    services: {
      vault: { port: 8610 },
      logger: { port: 8620 },
      queue: { port: 8640 },
      maestro: { port: 8630 },
      helm: { port: 8650 },
      ged: { port: 8660 },
    },
    backup: {
      schedule: '0 2 * * *',
      retentionDays: 7,
      praSync: true,
    }
  };
  fs.writeFileSync(path.join(univDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // 3. Client Context
  fs.writeFileSync(path.join(contextDir, 'briefing.md'), `# Briefing Entreprise — ${client}

Bienvenue dans l'univers Shaper OS dédié à **${client}**.
Toutes les opérations administratives, documentaires et logicielles sont exécutées de manière souveraine sur cette instance.
`);

  console.log(`✅ [Client Delivery Engine] Univers client généré avec succès !`);
  console.log(`   📁 Répertoire : universes/univ-${slug}`);
  console.log(`   ⚙️ Config     : universes/univ-${slug}/deploy/${slug}.env`);
  console.log(`   📄 Manifest   : universes/univ-${slug}/manifest.json`);
  if (gitRemote) {
    console.log(`   📦 Dépôt Git  : ${gitRemote}`);
  }
  console.log(`\nPour initialiser et démarrer l'univers client :`);
  console.log(`   export UNIV9_ENV_FILE=universes/univ-${slug}/deploy/${slug}.env`);
  console.log(`   bash universes/univ9/deploy/podman-up.sh\n`);
}

const args = process.argv.slice(2);
const parsed = parseArgs(args);

if (parsed.command === 'create') {
  deliverClientUniverse(parsed);
} else {
  console.log(`
Shaper OS — Client Delivery CLI
Usage:
  node scripts/client-delivery.mjs create --slug <slug> --client "<Nom Client>" --domain "<domain>" [--git-remote <url>]
`);
}
