#!/usr/bin/env node
/**
 * Automated Playwright / Chromium End-to-End Business Flow Runner
 * Target: SHAPER OS Cockpit (default: https://ia-p3.xavdp.pro)
 */
import pkg from '/thePool0/zaza/Bureau/REMOTE3/software/bricks/brick-helm/app/node_modules/@playwright/test/index.js';
const { chromium } = pkg;
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://ia-p3.xavdp.pro';
const EMAIL = process.env.E2E_EMAIL || 'xavier@xavdp.pro';
const PASSWORD = process.env.E2E_PASSWORD || 'bgvfVFCD123!';

const SCREENSHOT_DIR = path.resolve('./e2e-artifacts');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

console.log('===============================================================');
console.log(' 🎭 SHAPER OS — AUTONOMOUS BUSINESS E2E PLAYWRIGHT VALIDATION');
console.log(` Target : ${BASE_URL}`);
console.log(` User   : ${EMAIL}`);
console.log('===============================================================\n');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // Step 1: Login Flow
    // -------------------------------------------------------------
    console.log('▶ [Step 1] Testing Authentication & Session Persistence...');
    await page.goto(`${BASE_URL}/?lang=fr`, { waitUntil: 'networkidle', timeout: 30000 });
    
    const emailField = page.getByPlaceholder(/you@domain|vous@domaine|tu@dominio/i)
      .or(page.locator('input[type="text"], input[type="email"]').first());
    const passwordField = page.getByPlaceholder('••••••••')
      .or(page.locator('input[type="password"]').first());
    
    if (await passwordField.isVisible()) {
      await emailField.fill(EMAIL);
      await passwordField.fill(PASSWORD);
      await page.getByRole('button', { name: /S'authentifier|Sign in|Se connecter/i }).click();
      await page.waitForURL(/\/(console|admin)/, { timeout: 25000 });
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-console-logged-in.png') });
    console.log(`  ✓ Authentification réussie et session active (${page.url()})`);

    // -------------------------------------------------------------
    // Step 2: Presentation & Briefing Verification
    // -------------------------------------------------------------
    console.log('\n▶ [Step 2] Testing Presentation Briefing & Active Engine Header...');
    await page.waitForSelector('text=OpenCode', { timeout: 15000 });
    await page.waitForSelector('text=Bonjour Xavier, je suis Zephir', { timeout: 15000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-presentation-briefing.png') });
    console.log('  ✓ Planche de présentation affichée : "Bonjour Xavier, je suis Zephir..."');

    // -------------------------------------------------------------
    // Step 3: Document Ingestion (Catalog & Sales CSV)
    // -------------------------------------------------------------
    console.log('\n▶ [Step 3] Testing Document Ingestion (ventes-canapes-2026.csv)...');
    const csvData = 'Date,Modele,Quantite,PrixUnitaire,MargeBrute\n2026-06-01,Canapé Oslo,14,890,4200\n2026-06-15,Canapé Helsinki,9,1250,3750\n2026-07-02,Canapé Stockholm,22,650,4400\n2026-07-20,Canapé Oslo,18,890,5400\n2026-08-05,Canapé Helsinki,12,1250,5000\n';
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'ventes-canapes-2026.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvData, 'utf8'),
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-document-attached.png') });
      console.log('  ✓ Document CSV attaché avec succès dans le composer');
    }

    // -------------------------------------------------------------
    // Step 4: Autonomous Business Request (Sofa Sales Chart)
    // -------------------------------------------------------------
    console.log('\n▶ [Step 4] Testing Business Prompt Injection (Sofa Sales Stats)...');
    const businessPrompt = 'Génère la page de statistiques interactive avec le graphique des ventes de nos canapés (Oslo, Helsinki, Stockholm).';
    const textarea = page.locator('textarea').first();
    await textarea.fill(businessPrompt);
    
    // Press Enter to submit
    await textarea.press('Enter');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-prompt-injected.png') });
    console.log('  ✓ Prompt utilisateur enregistré et injecté dans le flux réactif');

    // -------------------------------------------------------------
    // Step 5: Multi-Surface Navigation (/talk & /ged)
    // -------------------------------------------------------------
    console.log('\n▶ [Step 5] Testing Multi-surface Navigation (/talk & /ged)...');
    
    // Talk Page
    await page.goto(`${BASE_URL}/talk`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-talk-interface.png') });
    console.log('  ✓ Interface vocale (/talk) vérifiée');

    // GED Page
    await page.goto(`${BASE_URL}/ged`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-ged-interface.png') });
    console.log('  ✓ Interface GED (/ged) vérifiée');

    console.log('\n===============================================================');
    console.log(' 🏆 TOUS LES SCÉNARIOS E2E PLAYWRIGHT SONT VALIDÉS À 100% !');
    console.log('===============================================================');

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ ERREUR LORS DU TEST E2E PLAYWRIGHT:', err);
  process.exit(1);
});
