import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  encryptSecret,
  decryptSecret,
  normalizeMasterKey,
  validateMailboxSchema,
  VaultStore,
  VaultClient,
  createVaultServer
} from '../index.js';

describe('@shaper/vault-engine Unit & Integration Tests', () => {
  const MASTER_KEY = 'test-master-key-32-chars-long-secret!!';
  const STORAGE_PATH = path.join(process.cwd(), 'test-vault-storage.json');

  after(() => {
    if (fs.existsSync(STORAGE_PATH)) {
      fs.unlinkSync(STORAGE_PATH);
    }
  });

  describe('1. AES-256-GCM Encryption / Decryption', () => {
    it('should encrypt and decrypt a string payload', () => {
      const plaintext = 'MonMotDePasseTresSecret123!';
      const encrypted = encryptSecret(plaintext, MASTER_KEY);

      assert.ok(encrypted.iv);
      assert.ok(encrypted.authTag);
      assert.ok(encrypted.ciphertext);
      assert.notEqual(encrypted.ciphertext, plaintext);

      const decrypted = decryptSecret(encrypted, MASTER_KEY);
      assert.equal(decrypted, plaintext);
    });

    it('should encrypt and decrypt a JSON object payload', () => {
      const payload = {
        host: 'ssl0.ovh.net',
        port: 993,
        user: 'contact@zoutik.shop',
        pass: 'SecretPass999!'
      };

      const encrypted = encryptSecret(payload, MASTER_KEY);
      const decrypted = decryptSecret(encrypted, MASTER_KEY);

      assert.deepEqual(decrypted, payload);
    });

    it('should fail decryption when ciphertext is tampered (Authentication Error)', () => {
      const encrypted = encryptSecret('Sensitive Data', MASTER_KEY);
      // Alter ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + '00';
      const tamperedRecord = { ...encrypted, ciphertext: tamperedCiphertext };

      assert.throws(() => {
        decryptSecret(tamperedRecord, MASTER_KEY);
      });
    });

    it('should fail decryption with wrong master key', () => {
      const encrypted = encryptSecret('Sensitive Data', MASTER_KEY);
      assert.throws(() => {
        decryptSecret(encrypted, 'wrong-master-key-xyz');
      });
    });
  });

  describe('2. Mailbox Schema Validation', () => {
    it('should validate a valid mailbox config conforming to spec §4', () => {
      const validConfig = {
        slug: 'contact-zoutik-shop',
        provider: 'ovh-zimbra',
        imap: {
          host: 'ssl0.ovh.net',
          port: 993,
          user: 'contact@zoutik.shop',
          pass: 'secret',
          tls: true
        },
        smtp: {
          host: 'ssl0.ovh.net',
          port: 465,
          user: 'contact@zoutik.shop',
          pass: 'secret'
        }
      };

      const res = validateMailboxSchema(validConfig);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
    });

    it('should reject invalid mailbox config', () => {
      const invalidConfig = {
        slug: 'bad-box',
        provider: 'invalid-provider'
      };

      const res = validateMailboxSchema(invalidConfig);
      assert.equal(res.valid, false);
      assert.ok(res.errors.length > 0);
    });
  });

  describe('3. VaultStore Persistence', () => {
    it('should save, list, retrieve, and delete secrets with disk persistence', () => {
      const store1 = new VaultStore({ masterKey: MASTER_KEY, storageFile: STORAGE_PATH });
      
      store1.setSecret('secret/mail/test-slug', {
        slug: 'test-slug',
        provider: 'generic-imap',
        imap: { host: 'imap.test', port: 993, user: 'u', pass: 'p' },
        smtp: { host: 'smtp.test', port: 465, user: 'u', pass: 'p' }
      });

      store1.setSecret('secret/ai/gemini-key', 'AIzaSyDemoKey123');

      assert.equal(store1.listKeys().length, 2);
      assert.equal(store1.getSecret('secret/ai/gemini-key'), 'AIzaSyDemoKey123');

      // Reload store from disk
      const store2 = new VaultStore({ masterKey: MASTER_KEY, storageFile: STORAGE_PATH });
      assert.equal(store2.listKeys().length, 2);
      assert.equal(store2.getSecret('secret/ai/gemini-key'), 'AIzaSyDemoKey123');

      // Delete secret
      store2.deleteSecret('secret/ai/gemini-key');
      assert.equal(store2.getSecret('secret/ai/gemini-key'), null);
      assert.equal(store2.listKeys().length, 1);
    });
  });

  describe('4. REST Server & VaultClient Integration', () => {
    let server;
    let client;
    const PORT = 8529;
    const TOKEN = 'gbs-test-token-777';

    before(async () => {
      server = createVaultServer({
        port: PORT,
        masterKey: MASTER_KEY,
        vaultToken: TOKEN,
        storageFile: null // in-memory
      });
      client = new VaultClient({ vaultUrl: `http://127.0.0.1:${PORT}`, vaultToken: TOKEN });
      await new Promise((resolve) => server.on('listening', resolve));
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it('should return health status', async () => {
      const health = await client.health();
      assert.equal(health.status, 'ok');
      assert.equal(health.service, 'vault-v1');
    });

    it('should reject requests with invalid token', async () => {
      const badClient = new VaultClient({ vaultUrl: `http://127.0.0.1:${PORT}`, vaultToken: 'wrong' });
      await assert.rejects(async () => {
        await badClient.listSecrets();
      }, /401/);
    });

    it('should perform full secret CRUD over HTTP via VaultClient', async () => {
      // 1. Set secret
      const payload = { apiKey: 'secret-api-key-999', active: true };
      await client.setSecret('secret/cloud/demo', payload);

      // 2. List secrets
      const keys = await client.listSecrets();
      assert.ok(keys.includes('secret/cloud/demo'));

      // 3. Get secret
      const retrieved = await client.getSecret('secret/cloud/demo');
      assert.deepEqual(retrieved, payload);

      // 4. Delete secret
      await client.deleteSecret('secret/cloud/demo');
      const retrievedAfterDelete = await client.getSecret('secret/cloud/demo');
      assert.equal(retrievedAfterDelete, null);
    });
  });
});
