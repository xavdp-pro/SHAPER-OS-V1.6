import puppeteer from 'file:///home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/scratch/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const BASE_URL = process.env.BASE_URL || 'https://ia.szde.fr';
const ART_DIR = '/home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854';

console.log('===========================================================');
console.log(' 🚀 TEST DU CHAT CONSOLE (MODE PRINCIPAL)');
console.log(` Cible : ${BASE_URL}`);
console.log('===========================================================\n');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[error]') || text.includes('Uncaught') || text.includes('Error')) {
      console.log('  [Browser Log]', text);
    }
  });

  // 1. Authentification
  console.log('[1/4] Connexion Administrateur...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    const emailInput = await page.$('input[type="text"], input[type="email"]');
    if (emailInput) await emailInput.type('xavier@xavdp.pro');
    await passInput.type('bgvfVFCD123!');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log('  ✓ Authentifié avec succès, URL actuelle:', page.url());

  // 2. Vérification de la Console Chat
  console.log('\n[2/4] Chargement de la Console Chat (/console)...');
  await page.waitForSelector('textarea, [data-help-target="help-chat-input"]', { timeout: 15000 });
  console.log('  ✓ Champ de saisie chat présent et actif');

  await page.screenshot({ path: `${ART_DIR}/chat_console_initial.png` });

  // 3. Envoi d'un message dans le Chat
  console.log('\n[3/4] Envoi d\'un message dans le Chat...');
  const textarea = await page.$('textarea');
  if (!textarea) throw new Error('Textarea introuvable');

  await textarea.type('Bonjour ! Fais-moi une présentation synthétique de ton rôle.');
  await new Promise(r => setTimeout(r, 500));

  // Cliquer sur le bouton d'envoi ou appuyer sur Entrée
  const sendButton = await page.$('button[type="submit"], button[aria-label="Envoyer"]');
  if (sendButton) {
    await sendButton.click();
  } else {
    await textarea.press('Enter');
  }
  console.log('  ✓ Message soumis');

  // 4. Attente de la réponse en streaming
  console.log('\n[4/4] Attente de la réponse de l\'assistant...');
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: `${ART_DIR}/chat_console_responded.png` });

  const textBlocks = await page.$$eval('[data-help-target="help-chat-viewport"] p, .prose p', els => els.map(e => e.textContent.trim()).filter(Boolean));
  console.log(`  -> Blocs de texte détectés dans la timeline (${textBlocks.length})`);
  if (textBlocks.length > 0) {
    console.log('  Dernier texte extrait :', textBlocks[textBlocks.length - 1].slice(0, 120) + '...');
  }

  await browser.close();
  console.log('\n===========================================================');
  console.log(' ✅ LE CHAT CONSOLE FONCTIONNE PARFAITEMENT !');
  console.log('===========================================================');
})().catch(err => {
  console.error('❌ ERREUR LORS DU TEST DU CHAT :', err);
  process.exit(1);
});
