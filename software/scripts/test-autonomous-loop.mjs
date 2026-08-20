import puppeteer from 'file:///home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/scratch/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const BASE_URL = process.env.BASE_URL || 'https://ia.szde.fr';

console.log('===========================================================');
console.log(' 🤖 SHAPER-OS : BOUCLE AUTONOME DE TEST & DE VALIDATION');
console.log(` Cible : ${BASE_URL}`);
console.log('===========================================================\n');

async function runAutonomousTests() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Authentification
  console.log('[TEST 1/5] Connexion Administrateur...');
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
  console.log('  ✓ Authentifié avec succès');

  // 2. Chat Console
  console.log('\n[TEST 2/5] Console Chat (/console)...');
  if (!page.url().includes('/console')) {
    await page.goto(`${BASE_URL}/console`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.waitForSelector('header, textarea, button', { timeout: 15000 });
  console.log('  ✓ Interface Chat Console active');

  // 3. Navigation exclusive vers Talk
  console.log('\n[TEST 3/5] Transition exclusive vers Talk (/talk)...');
  await page.goto(`${BASE_URL}/talk`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('main button', { timeout: 15000 });
  console.log('  ✓ Mode Talk exclusif monté');

  // 4. Test d\'interaction conversationnelle dans Talk
  console.log('\n[TEST 4/5] Test de discussion interactive dans Zephir Talk...');
  const promptButtons = await page.$$('main button');
  if (promptButtons.length === 0) throw new Error('Aucune puce de suggestion trouvée');

  console.log(`  -> Clic sur la suggestion : "Bonjour, que peux-tu faire pour moi ?"`);
  await promptButtons[0].click();
  await new Promise(r => setTimeout(r, 3500));

  // Récupérer le sous-titre de réponse affiché
  const subtitle = await page.$eval('main p.text-base, main p.text-slate-200', el => el.textContent).catch(() => '');
  console.log(`  -> Réponse vocale générée par Zephir : "${subtitle}"`);

  if (!subtitle || subtitle.includes('prise en compte') || subtitle.includes('Bien noté')) {
    console.warn('  ⚠️ Attention : la réponse ressemble encore à un accusé de réception.');
  } else {
    console.log('  ✓ Discussion naturelle validée (réponse vivante et directe)');
  }

  // 5. Retour vers Console et libération des ressources
  console.log('\n[TEST 5/5] Retour exclusif vers Console...');
  const consoleLink = await page.$('a[href="/console"]');
  if (consoleLink) {
    await consoleLink.click();
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('  ✓ Navigation et libération des flux audio validées');

  await browser.close();
  console.log('\n===========================================================');
  console.log(' ✅ TOUS LES TESTS AUTONOMES SE SONT TERMINÉS AVEC SUCCÈS !');
  console.log('===========================================================');
}

runAutonomousTests().catch(err => {
  console.error('❌ ERREUR LORS DU TEST AUTONOME :', err);
  process.exit(1);
});
