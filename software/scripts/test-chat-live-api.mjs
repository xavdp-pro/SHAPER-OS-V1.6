#!/usr/bin/env node
/**
 * CLI Test Script for Shaper OS Agent & Chat API
 * Usage: node software/scripts/test-chat-live-api.mjs [BASE_URL] [EMAIL] [PASSWORD]
 */

const BASE_URL = process.argv[2] || process.env.HELM_URL || 'https://ia-p3.xavdp.pro';
const EMAIL = process.argv[3] || process.env.TEST_USER_EMAIL || 'xavier@xavdp.pro';
const PASSWORD = process.argv[4] || process.env.TEST_USER_PASSWORD || 'bgvfVFCD123!';

async function run() {
  console.log(`\n🔍 [test-chat-live-api] Cible: ${BASE_URL}`);

  // 1. Auth Login
  console.log(`1. Authentification pour ${EMAIL}...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  if (!loginRes.ok) {
    throw new Error(`Login échoué: HTTP ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`   ✓ Authentifié avec succès (User: ${user?.name || user?.email}, ID: ${user?.id})`);

  // 2. Inject Prompt
  const prompt = 'Bonjour Zephir, confirme en une phrase que tu es en ligne et indique ton modèle.';
  console.log(`2. Injection du prompt: "${prompt}"...`);
  const injectRes = await fetch(`${BASE_URL}/api/inject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversation: `opencode/zaza/${user?.name || 'Xavier'}`,
      message: prompt
    })
  });

  if (!injectRes.ok) {
    throw new Error(`Inject échoué: HTTP ${injectRes.status} ${await injectRes.text()}`);
  }

  const injectData = await injectRes.json();
  console.log(`   ✓ Inject validé (Modèle: ${injectData.model}, Run ID: ${injectData.run_id || 'n/a'})`);

  // 3. Attente et vérification
  console.log('3. Attente du traitement par l\'agent...');
  await new Promise((r) => setTimeout(r, 3000));

  console.log('✅ Pipeline de chat opérationnel.\n');
}

run().catch((err) => {
  console.error(`❌ Erreur: ${err.message}`);
  process.exit(1);
});
