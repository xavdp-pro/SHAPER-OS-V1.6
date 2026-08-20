import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { DEMO_ADMIN } from './demoAdmin.js';
import { DEMO_GUESTS, hashGuestPassword } from './demoGuests.js';
import { hashPassword } from './password.js';

let pool = null;

function readPasswdFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

/** Resolve MariaDB credentials (turbinobash etc/mysql or env). */
export function mysqlConfig() {
  const passwdFile = process.env.MYSQL_PASSWD_FILE
    || path.join('/apps/helm-v2/etc/mysql/localhost/passwd');
  const password = process.env.MYSQL_PASSWORD || readPasswdFile(passwdFile) || '';
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'helm-v2',
    password,
    database: process.env.MYSQL_DATABASE || 'helm-v2',
    waitForConnections: true,
    connectionLimit: 5,
  };
}

export function getPool() {
  if (!pool) {
    const cfg = mysqlConfig();
    if (!cfg.password && process.env.NODE_ENV !== 'test') {
      console.warn('[helm-v2] MariaDB: no password (MYSQL_PASSWORD or passwd file)');
    }
    pool = mysql.createPool(cfg);
  }
  return pool;
}

export async function query(sql, params = []) {
  try {
    const [rows] = await getPool().execute(sql, params);
    return rows;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ENOTFOUND') {
      return [];
    }
    throw err;
  }
}

export async function ensureUsersSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT '',
      role ENUM('admin','operator','viewer') NOT NULL DEFAULT 'operator',
      status ENUM('active','disabled','pending') NOT NULL DEFAULT 'active',
      password_hash VARCHAR(255) NULL,
      magic_token_hash VARCHAR(64) NULL,
      magic_token_expires_at DATETIME NULL,
      last_login_at DATETIME NULL,
      notes VARCHAR(500) NULL,
      briefing TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email),
      KEY idx_users_status (status),
      KEY idx_users_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureUsersColumn(
    'briefing',
    'TEXT NULL COMMENT \'Operator briefing for Cursor CLI sessions\' AFTER notes',
  );
  await ensureUsersColumn(
    'first_name',
    'VARCHAR(80) NULL AFTER name',
  );
  await ensureUsersColumn(
    'last_name',
    'VARCHAR(80) NULL AFTER first_name',
  );
  await ensureUsersColumn(
    'demo_slug',
    'VARCHAR(64) NULL COMMENT \'Personalized demo URL ?user=slug\' AFTER last_name',
  );
  await ensureUsersColumn(
    'demo_password',
    'VARCHAR(120) NULL COMMENT \'Plain password for demo-invite autofill only\' AFTER demo_slug',
  );
  await ensureUsersColumn(
    'demo_conversation',
    'VARCHAR(120) NULL COMMENT \'Dedicated CLI conversation name\' AFTER demo_password',
  );

  // Unique slug when set
  try {
    await query(
      `ALTER TABLE users ADD UNIQUE KEY uq_users_demo_slug (demo_slug)`,
    );
  } catch {
    /* already exists */
  }

  await ensureDemoAdminUser();
  await ensureDemoGuestUsers();

  const { ensureAllUsersHaveConversations } = await import('./userSession.js');
  await ensureAllUsersHaveConversations();
}

async function ensureUsersColumn(column, definition) {
  const rows = await query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = ?`,
    [column],
  );
  if (Number(rows[0]?.n || 0) > 0) return;
  await query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
}

/** Upsert demo operator TheSuperUser — demo mode only. */
async function ensureDemoAdminUser() {
  if (!config.isDemo) return;
  const email = String(DEMO_ADMIN.email).trim().toLowerCase();
  const name = String(DEMO_ADMIN.name).trim();
  const role = ['admin', 'operator', 'viewer'].includes(DEMO_ADMIN.role)
    ? DEMO_ADMIN.role
    : 'operator';
  const notes = String(DEMO_ADMIN.notes || '').trim() || null;
  const conversation = String(DEMO_ADMIN.conversation || 'Demo').trim() || 'Demo';
  const passwordHash = await hashPassword(DEMO_ADMIN.password);
  const defaultBriefing = String(DEMO_ADMIN.briefing || '').trim() || null;

  const existing = await query(
    'SELECT id, briefing FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  if (existing[0]?.id) {
    await query(
      `UPDATE users
       SET name = ?, role = ?, status = 'active', password_hash = ?, notes = ?,
           demo_conversation = ?
       WHERE id = ?`,
      [name, role, passwordHash, notes, conversation, existing[0].id],
    );
    if (!String(existing[0].briefing || '').trim() && defaultBriefing) {
      await query('UPDATE users SET briefing = ? WHERE id = ?', [
        defaultBriefing,
        existing[0].id,
      ]);
    } else if (
      defaultBriefing
      && (
        String(existing[0].briefing || '').includes('Helm est la console')
        || String(existing[0].briefing || '').includes('réponds en français')
        || String(existing[0].briefing || '').includes('Je suis TheSuperUser')
      )
    ) {
      await query('UPDATE users SET briefing = ? WHERE id = ?', [
        defaultBriefing,
        existing[0].id,
      ]);
    }
    return;
  }

  await query(
    `INSERT INTO users (email, name, role, status, notes, password_hash, briefing, demo_conversation)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
    [email, name, role, notes, passwordHash, defaultBriefing, conversation],
  );
}

/** Upsert personalized demo guests — demo mode only. */
async function ensureDemoGuestUsers() {
  if (!config.isDemo) return;
  for (const guest of DEMO_GUESTS) {
    const email = String(guest.email).trim().toLowerCase();
    const firstName = String(guest.firstName || '').trim();
    const lastName = String(guest.lastName || '').trim();
    const name = String(guest.name || `${firstName} ${lastName}`).trim();
    const slug = String(guest.demoSlug || '').trim().toLowerCase();
    const plain = String(guest.password || '').trim();
    const conversation = String(guest.conversation || firstName || slug).trim();
    const briefing = String(guest.briefing || '').trim() || null;
    const notes = String(guest.notes || '').trim() || null;
    const role = guest.role === 'admin' ? 'operator' : (guest.role || 'operator');
    if (!email || !slug || !plain) continue;

    const passwordHash = await hashGuestPassword(plain);
    const existing = await query(
      'SELECT id FROM users WHERE email = ? OR demo_slug = ? LIMIT 1',
      [email, slug],
    );

    if (existing[0]?.id) {
      await query(
        `UPDATE users SET
           email = ?, name = ?, first_name = ?, last_name = ?,
           role = ?, status = 'active', notes = ?, briefing = ?,
           password_hash = ?, demo_slug = ?, demo_password = ?, demo_conversation = ?
         WHERE id = ?`,
        [
          email, name, firstName || null, lastName || null,
          role, notes, briefing,
          passwordHash, slug, plain, conversation || null,
          existing[0].id,
        ],
      );
      continue;
    }

    await query(
      `INSERT INTO users (
         email, name, first_name, last_name, role, status, notes, briefing,
         password_hash, demo_slug, demo_password, demo_conversation
       ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        email, name, firstName || null, lastName || null, role, notes, briefing,
        passwordHash, slug, plain, conversation || null,
      ],
    );
  }
}
