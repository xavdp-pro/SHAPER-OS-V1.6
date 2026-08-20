import puppeteer from 'file:///home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/scratch/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

async function run() {
  console.log('Testing Chat Pipeline End-to-End...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  console.log('1. Connexion login...');
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

  console.log('2. Console...');
  await page.goto('https://ia.szde.fr/console', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('3. Envoi message...');
  const textarea = await page.$('textarea');
  if (!textarea) {
    console.error('Textarea introuvable !');
    await browser.close();
    return;
  }
  await textarea.type('Bonjour');
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 8000));

  const artifactPath = '/home/zaza/.gemini/antigravity/brain/8dfc7b6b-357d-451b-9c4e-cadeed245854/chat_pipeline_tested.png';
  await page.screenshot({ path: artifactPath, fullPage: false });
  console.log('✓ Capture d écran enregistrée dans :', artifactPath);

  await browser.close();
}

run().catch(console.error);
