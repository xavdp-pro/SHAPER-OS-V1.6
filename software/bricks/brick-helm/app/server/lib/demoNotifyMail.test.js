import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  demoNotifyEnabled,
  demoNotifyTo,
  buildDemoNotifySubject,
} from './demoNotifyMail.js';

describe('demoNotifyMail', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    process.env.DEMO_NOTIFY = '1';
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it('is disabled without SMTP credentials', () => {
    assert.equal(demoNotifyEnabled(), false);
  });

  it('is disabled when DEMO_NOTIFY=0', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.DEMO_NOTIFY = '0';
    assert.equal(demoNotifyEnabled(), false);
  });

  it('defaults notify recipient', () => {
    assert.equal(demoNotifyTo(), 'admin@xavdp.pro');
  });

  it('builds agent-demo subject line', () => {
    const subject = buildDemoNotifySubject({
      kind: 'request',
      lang: 'fr',
      conversation: 'Ivonne',
      host: 'agent-demo.xavdp.pro',
    });
    assert.equal(subject, '[demo agent-demo.xavdp.pro] request · fr · Ivonne');
  });
});
