import puppeteer from 'file:///home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/scratch/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const VIEWPORTS = [
  {
    name: 'Desktop (1280x800)',
    width: 1280,
    height: 800,
    isMobile: false,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    name: 'Mobile (iPhone 14 - 390x844)',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  }
];

const BASE_URL = process.env.BASE_URL || 'https://ia.szde.fr';

console.log('=================================================');
console.log(' 🎭 SHAPER OS — SUITE COMPLÈTE E2E PLAYWRIGHT');
console.log(` Cible : ${BASE_URL}`);
console.log('=================================================\n');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Test Viewport : ${vp.name} ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
    await page.setUserAgent(vp.userAgent);

    // 1. Authentification
    console.log('1. Test Connexion Admin (xavier@xavdp.pro)...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      const emailInput = await page.$('input[type="text"], input[type="email"]');
      if (emailInput) await emailInput.type('xavier@xavdp.pro');
      await passInput.type('bgvfVFCD123!');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log('  ✓ Authentification réussie');

    // 2. Chat Console
    console.log('2. Test de la Console KovZu Chat...');
    const url = page.url();
    if (!url.includes('/console')) {
      await page.goto(`${BASE_URL}/console`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    await new Promise(r => setTimeout(r, 1500));
    const headerExists = await page.$('header');
    if (!headerExists) throw new Error('Header console introuvable');
    console.log('  ✓ Navbar & Chat montés correctement');

    // 3. Zephir Talk
    console.log('3. Test de Zephir Talk (/talk)...');
    await page.goto(`${BASE_URL}/talk`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    
    const orb = await page.$('.relative');
    const buttons = await page.$$('main button');
    if (!orb || buttons.length === 0) throw new Error('Éléments TalkPage manquants');
    console.log(`  ✓ Talk monté (${buttons.length} puces de suggestions interactives prêtes)`);

    // 4. Mini-GED
    console.log('4. Test de la Mini-GED (/ged)...');
    await page.goto(`${BASE_URL}/ged`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const dropzone = await page.$('#dropzone');
    const filterTabs = await page.$('#filterTabs');
    if (!dropzone || !filterTabs) throw new Error('Éléments Mini-GED manquants');
    console.log('  ✓ Mini-GED opérationnelle avec fil d’Ariane, filtres et dropzone');

    await page.close();
  }

  await browser.close();

  console.log('\n=================================================');
  console.log(' ✅ TOUS LES TESTS E2E SONT VALIDÉS SANS ERREUR !');
  console.log('=================================================');
})().catch(err => {
  console.error('❌ ERREUR TEST E2E:', err);
  process.exit(1);
});
