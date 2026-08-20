import puppeteer from 'file:///home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/scratch/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

async function run() {
  console.log('Testing Interaction Mode Selector & Voice Controls in Console...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Connexion
  await page.goto('https://ia.szde.fr', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    const emailInput = await page.$('input[type="text"], input[type="email"]');
    if (emailInput) await emailInput.type('xavier@xavdp.pro');
    await passInput.type('bgvfVFCD123!');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));
  }

  await page.goto('https://ia.szde.fr/console', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Vérification du sélecteur de mode
  const modeBtn = await page.$('button[aria-haspopup="listbox"]');
  console.log('✓ Bouton Sélecteur de mode détecté :', Boolean(modeBtn));

  // 3. Vérification du bouton Micro & Audio
  const micBtn = await page.$('button[data-help-target="help-voice-mic"]');
  const audioBtn = await page.$('button[data-help-target="help-voice-audio"]');
  console.log('✓ Bouton Micro présent dans le Chat :', Boolean(micBtn));
  console.log('✓ Bouton Lecture Audio présent dans le Chat :', Boolean(audioBtn));

  // 4. Capture d'écran
  const artifactPath = '/home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/console_with_modes_and_mic.png';
  await page.screenshot({ path: artifactPath, fullPage: false });
  console.log('✓ Capture d écran sauvegardée dans :', artifactPath);

  await browser.close();
}

run().catch(console.error);
