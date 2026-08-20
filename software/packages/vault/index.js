/**
 * @file index.js
 * @package @shaper/vault-engine
 * @description Moteur de gestion de secrets chiffrés AES-256-GCM et serveur REST pour Podman.
 * Zéro dépendance externe — utilise uniquement node:crypto et node:http.
 */

import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard GCM IV length (96 bits)
const AUTH_TAG_LENGTH = 16; // Standard GCM Auth Tag (128 bits)

/**
 * Dérive une clé de 256 bits (32 octets) à partir d'une chaîne ou d'une clé brute.
 * @param {string|Buffer} keySource 
 * @returns {Buffer}
 */
export function normalizeMasterKey(keySource) {
  if (!keySource) {
    throw new Error('Vault master key is required.');
  }
  if (Buffer.isBuffer(keySource) && keySource.length === 32) {
    return keySource;
  }
  const str = String(keySource).trim();
  // Si c'est un hex valide de 64 caractères (32 octets)
  if (/^[0-9a-fA-F]{64}$/.test(str)) {
    return Buffer.from(str, 'hex');
  }
  // Sinon dérivation SHA-256
  return crypto.createHash('sha256').update(str).digest();
}

/**
 * Chiffre une charge utile (objet ou chaîne) en AES-256-GCM.
 * @param {object|string} payload 
 * @param {string|Buffer} masterKey 
 * @returns {{ iv: string, authTag: string, ciphertext: string }}
 */
export function encryptSecret(payload, masterKey) {
  const key = normalizeMasterKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    authTag,
    ciphertext: encrypted
  };
}

/**
 * Déchiffre un secret chiffré en AES-256-GCM et parse le JSON si applicable.
 * @param {{ iv: string, authTag: string, ciphertext: string }} record 
 * @param {string|Buffer} masterKey 
 * @returns {object|string}
 */
export function decryptSecret(record, masterKey) {
  if (!record || !record.iv || !record.authTag || !record.ciphertext) {
    throw new Error('Invalid encrypted record structure (missing iv, authTag, or ciphertext).');
  }
  const key = normalizeMasterKey(masterKey);
  const iv = Buffer.from(record.iv, 'hex');
  const authTag = Buffer.from(record.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(record.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}

/**
 * Valide un objet de configuration Mailbox selon le standard GBS (MAIL-AGENT-SOCLE-SPEC §4).
 * @param {object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMailboxSchema(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Configuration must be a non-null object.'] };
  }

  if (!data.slug || typeof data.slug !== 'string') errors.push('Field "slug" is required (string).');
  if (!data.provider || !['ovh-zimbra', 'google', 'microsoft365', 'generic-imap'].includes(data.provider)) {
    errors.push('Field "provider" must be one of: ovh-zimbra, google, microsoft365, generic-imap.');
  }

  // IMAP validation
  if (!data.imap || typeof data.imap !== 'object') {
    errors.push('Field "imap" object is required.');
  } else {
    if (!data.imap.host) errors.push('imap.host is required.');
    if (!data.imap.port || typeof data.imap.port !== 'number') errors.push('imap.port must be an integer.');
    if (!data.imap.user) errors.push('imap.user is required.');
    if (!data.imap.pass) errors.push('imap.pass is required.');
  }

  // SMTP validation
  if (!data.smtp || typeof data.smtp !== 'object') {
    errors.push('Field "smtp" object is required.');
  } else {
    if (!data.smtp.host) errors.push('smtp.host is required.');
    if (!data.smtp.port || typeof data.smtp.port !== 'number') errors.push('smtp.port must be an integer.');
    if (!data.smtp.user) errors.push('smtp.user is required.');
    if (!data.smtp.pass) errors.push('smtp.pass is required.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gestionnaire de stockage persistant chiffré.
 */
export class VaultStore {
  /**
   * @param {object} options
   * @param {string|Buffer} options.masterKey - Clé maître de chiffrement
   * @param {string} [options.storageFile] - Chemin du fichier persistant JSON
   */
  constructor({ masterKey, storageFile = null }) {
    this.masterKey = normalizeMasterKey(masterKey);
    this.storageFile = storageFile;
    /** @type {Map<string, { iv: string, authTag: string, ciphertext: string, updatedAt: string }>} */
    this.entries = new Map();
    this.init();
  }

  init() {
    if (this.storageFile && fs.existsSync(this.storageFile)) {
      try {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          for (const [key, val] of Object.entries(data)) {
            if (val && val.ciphertext) {
              this.entries.set(key, val);
            }
          }
        }
      } catch (err) {
        console.error(`[VaultStore] Error loading storage file: ${err.message}`);
      }
    }
  }

  persist() {
    if (!this.storageFile) return;
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Object.fromEntries(this.entries);
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[VaultStore] Error persisting storage file: ${err.message}`);
    }
  }

  /**
   * Enregistre un secret sous une clé (ex: "secret/mail/contact-zoutik" ou "mailbox-contact-zoutik").
   * @param {string} key 
   * @param {object|string} payload 
   */
  setSecret(key, payload) {
    if (!key) throw new Error('Secret key is required.');
    
    // Normaliser la clé
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
    
    // Si c'est un secret de type mail, validation optionnelle
    if (normalizedKey.startsWith('secret/mail/') || normalizedKey.startsWith('mailbox-')) {
      const validation = validateMailboxSchema(payload);
      if (!validation.valid && typeof payload === 'object' && payload.provider) {
        throw new Error(`Mailbox schema validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const encrypted = encryptSecret(payload, this.masterKey);
    this.entries.set(normalizedKey, {
      ...encrypted,
      updatedAt: new Date().toISOString()
    });
    this.persist();
    return true;
  }

  /**
   * Récupère et déchiffre un secret.
   * @param {string} key 
   * @returns {object|string|null}
   */
  getSecret(key) {
    if (!key) return null;
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
    const record = this.entries.get(normalizedKey);
    if (!record) return null;
    return decryptSecret(record, this.masterKey);
  }

  /**
   * Supprime un secret.
   * @param {string} key 
   * @returns {boolean}
   */
  deleteSecret(key) {
    if (!key) return false;
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
    const deleted = this.entries.delete(normalizedKey);
    if (deleted) this.persist();
    return deleted;
  }

  /**
   * Liste les clés enregistrées (sans métadonnées sensibles ni contenu).
   * @returns {string[]}
   */
  listKeys() {
    return Array.from(this.entries.keys());
  }
}

/**
 * Client HTTP pour consommer un serveur Vault distant ou local.
 */
export class VaultClient {
  /**
   * @param {object} options
   * @param {string} options.vaultUrl - URL du serveur Vault (ex: "http://127.0.0.1:8510")
   * @param {string} [options.vaultToken] - Token Bearer d'authentification
   */
  constructor({ vaultUrl = 'http://127.0.0.1:8510', vaultToken = null } = {}) {
    this.vaultUrl = vaultUrl.replace(/\/+$/, '');
    this.vaultToken = vaultToken;
  }

  async _request(endpoint, { method = 'GET', body = null } = {}) {
    const url = `${this.vaultUrl}${endpoint}`;
    const headers = { 'Accept': 'application/json' };
    if (this.vaultToken) {
      headers['Authorization'] = `Bearer ${this.vaultToken}`;
    }
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Vault request failed [${res.status} ${res.statusText}]: ${errText}`);
    }

    return await res.json();
  }

  async health() {
    return this._request('/api/health');
  }

  async listSecrets() {
    const res = await this._request('/api/secrets');
    return res.keys || [];
  }

  async getSecret(pathOrKey) {
    const cleanKey = pathOrKey.startsWith('/') ? pathOrKey.slice(1) : pathOrKey;
    try {
      const res = await this._request(`/api/secret/${cleanKey}`);
      return res.data;
    } catch (err) {
      if (err.message.includes('404')) return null;
      throw err;
    }
  }

  async setSecret(pathOrKey, payload) {
    const cleanKey = pathOrKey.startsWith('/') ? pathOrKey.slice(1) : pathOrKey;
    return this._request(`/api/secret/${cleanKey}`, {
      method: 'POST',
      body: { data: payload }
    });
  }

  async deleteSecret(pathOrKey) {
    const cleanKey = pathOrKey.startsWith('/') ? pathOrKey.slice(1) : pathOrKey;
    return this._request(`/api/secret/${cleanKey}`, { method: 'DELETE' });
  }
}

/**
 * Crée et démarre un serveur HTTP REST pour Vault.
 * @param {object} options
 * @param {number} [options.port=8510]
 * @param {string} [options.host='0.0.0.0']
 * @param {string|Buffer} options.masterKey
 * @param {string} [options.vaultToken]
 * @param {string} [options.storageFile]
 * @param {VaultStore} [options.vaultStore]
 * @returns {http.Server}
 */
export function createVaultServer({
  port = 8510,
  host = '0.0.0.0',
  masterKey = null,
  vaultToken = null,
  storageFile = null,
  vaultStore = null
} = {}) {
  const store = vaultStore || new VaultStore({ masterKey: masterKey || 'gbs-default-vault-key-change-in-prod', storageFile });

  const server = http.createServer(async (req, res) => {
    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Health check public
    if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
      return sendJson(200, {
        status: 'ok',
        service: 'vault-v1',
        secretsCount: store.listKeys().length,
        timestamp: new Date().toISOString()
      });
    }

    // Authentification Bearer token si configuré
    if (vaultToken) {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token !== vaultToken) {
        return sendJson(401, { error: 'Unauthorized: Invalid or missing VAULT_TOKEN.' });
      }
    }

    // GET /api/secrets (List keys)
    if (req.method === 'GET' && pathname === '/api/secrets') {
      return sendJson(200, {
        status: 'ok',
        keys: store.listKeys()
      });
    }

    // Routes /api/secret/*
    if (pathname.startsWith('/api/secret/')) {
      const secretKey = decodeURIComponent(pathname.replace('/api/secret/', ''));

      if (req.method === 'GET') {
        const secret = store.getSecret(secretKey);
        if (secret === null || secret === undefined) {
          return sendJson(404, { error: `Secret "${secretKey}" not found.` });
        }
        return sendJson(200, { status: 'ok', key: secretKey, data: secret });
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const dataToStore = parsed.data !== undefined ? parsed.data : parsed;
            store.setSecret(secretKey, dataToStore);
            return sendJson(200, { status: 'ok', message: `Secret "${secretKey}" stored successfully.` });
          } catch (err) {
            return sendJson(400, { error: `Failed to store secret: ${err.message}` });
          }
        });
        return;
      }

      if (req.method === 'DELETE') {
        const deleted = store.deleteSecret(secretKey);
        if (!deleted) {
          return sendJson(404, { error: `Secret "${secretKey}" not found.` });
        }
        return sendJson(200, { status: 'ok', message: `Secret "${secretKey}" deleted.` });
      }
    }

    // Route non trouvée
    sendJson(404, { error: 'Not Found' });
  });

  server.listen(port, host);
  return server;
}
