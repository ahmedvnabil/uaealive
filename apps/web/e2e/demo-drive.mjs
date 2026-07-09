// demo-drive.mjs — يقود الديمو الرسمي (8 محطات) ضد الموقع الحي
// الاستخدام:
//   node e2e/demo-drive.mjs                 → وضع التحقق (سريع + أسكرينشوت لكل محطة)
//   MODE=video node e2e/demo-drive.mjs      → وضع التسجيل (إيقاع عرض + فيديو webm)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'https://uaelive.zad.tools';
const VIDEO = process.env.MODE === 'video';
const OUT = process.env.OUT || '/tmp/demo-out';
mkdirSync(OUT, { recursive: true });

// إيقاع: في وضع الفيديو نتمهل ليتابع المشاهد
const pause = (ms) => new Promise((r) => setTimeout(r, VIDEO ? ms : Math.min(ms, 1200)));

const results = [];
const stop = async (name, fn) => {
  try {
    await fn();
    results.push([name, 'PASS']);
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push([name, `FAIL: ${e.message.split('\n')[0]}`]);
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  }
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'ar',
  ...(VIDEO ? { recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } } : {}),
});
const page = await context.newPage();
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// ── 1. الصفحة الرئيسية ──────────────────────────────────
await stop('1-landing /ar', async () => {
  await page.goto(BASE + '/ar', { waitUntil: 'networkidle', timeout: 45000 });
  await pause(3500);
  // تمرير سينمائي عبر الأقسام
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 620);
    await pause(1600);
  }
  const fahidiPillar = page.locator('a[href="/fahidi"]');
  if ((await fahidiPillar.count()) === 0) throw new Error('fahidi pillar missing');
  await fahidiPillar.first().scrollIntoViewIfNeeded();
  await pause(1800);
  await shot('1-landing');
});

// ── 2. الخريطة ──────────────────────────────────────────
await stop('2-map marker+drawer', async () => {
  await page.goto(BASE + '/ar/map', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('.maplibregl-marker', { timeout: 30000 });
  await pause(3500);
  await page.locator('.maplibregl-marker').nth(4).click();
  await pause(2500);
  const story = page.getByText('اقرأ القصة').first();
  await story.waitFor({ timeout: 10000 });
  await shot('2-map');
});

// ── 3. صفحة قصة + تبديل الجمهور ─────────────────────────
await stop('3-story audience tabs', async () => {
  await page.goto(BASE + '/ar/stories/arabian-tea-house', { waitUntil: 'domcontentloaded' });
  await pause(3000);
  await page.getByRole('button', { name: 'أطفال' }).first().click();
  await pause(2500);
  const listen = page.getByRole('button', { name: 'استمع للقصة' });
  if ((await listen.count()) === 0) throw new Error('listen button missing');
  if (VIDEO) { await listen.first().click().catch(() => {}); await pause(2500); }
  await shot('3-story');
});

// ── 4. التوأم الرقمي + الحقب ─────────────────────────────
await stop('4-twin era travel', async () => {
  await page.goto(BASE + '/ar/twin', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await pause(5000);
  for (const era of ['1950', '1970', '1990']) {
    const el = page.getByText(era, { exact: true }).first();
    if (await el.count()) { await el.click({ force: true }).catch(() => {}); await pause(1800); }
  }
  const today = page.getByText('اليوم', { exact: true }).first();
  if (await today.count()) await today.click({ force: true }).catch(() => {});
  await pause(2200);
  await shot('4-twin');
});

// ── 5. حوار مع سالم الغواص ──────────────────────────────
await stop('5-characters salem chat', async () => {
  await page.goto(BASE + '/ar/characters', { waitUntil: 'domcontentloaded' });
  await pause(2500);
  await page.getByRole('button', { name: 'ابدأ الحديث' }).first().click();
  const box = page.locator('textarea');
  await box.waitFor({ timeout: 10000 });
  await pause(800);
  await box.fill('كيف كان الغوص على اللؤلؤ؟');
  await pause(600);
  await box.press('Enter');
  // انتظر ردًّا يتدفق (حي عبر LiteLLM أو fallback)
  const before = (await page.innerText('body')).length;
  let grew = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if ((await page.innerText('body')).length > before + 80) { grew = true; break; }
  }
  if (!grew) throw new Error('no streamed reply');
  await pause(VIDEO ? 6000 : 500);
  await shot('5-chat');
});

// ── 6. الواقع المعزز (المحاكي SVG) ───────────────────────
await stop('6-ar simulator', async () => {
  await page.goto(BASE + '/ar/ar-experience', { waitUntil: 'domcontentloaded' });
  await pause(2500);
  await page.getByRole('button', { name: 'افتح المحاكي' }).first().click();
  await page.getByRole('button', { name: 'خروج من المحاكي' }).waitFor({ timeout: 15000 });
  await pause(2000);
  // جرّب معلمًا + مبدّل قبل/بعد
  const poiChip = page.getByRole('button', { name: /متحف النقود/ }).first();
  if (await poiChip.count()) { await poiChip.click().catch(() => {}); await pause(2200); }
  const beforeAfter = page.getByRole('button', { name: 'قبل / بعد' }).first();
  if (await beforeAfter.count()) { await beforeAfter.click().catch(() => {}); await pause(VIDEO ? 3500 : 1200); }
  await shot('6-ar');
});

// ── 7. رحلة الكنوز: كود DALLAH ──────────────────────────
await stop('7-hunt DALLAH', async () => {
  await page.goto(BASE + '/ar/hunt', { waitUntil: 'domcontentloaded' });
  await pause(2500);
  const before = await page.innerText('body');
  await page.getByRole('button', { name: 'وصلت! أدخل الرمز' }).first().click();
  const input = page.locator('input:visible').first();
  await input.waitFor({ timeout: 8000 });
  await input.fill('DALLAH');
  await pause(800);
  await input.press('Enter').catch(() => {});
  await pause(3000);
  const after = await page.innerText('body');
  if (after === before) throw new Error('no feedback after code');
  await shot('7-hunt');
});

// ── 8. خور النجوم في الفهيدي ─────────────────────────────
await stop('8-fahidi night walk', async () => {
  await page.goto(BASE + '/fahidi', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#startBtn', { timeout: 20000 });
  await pause(VIDEO ? 5000 : 2000);
  await page.click('#startBtn');
  await pause(2500);
  // امشِ في السكة الرئيسية حتى يظهر تلميح القراءة عند سوق السكة
  // (المدة ليست ثابتة: تسجيل الفيديو يخفض fps فتقل مسافة كل ثانية)
  await page.keyboard.down('w');
  let hintShown = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await page.locator('#hint:not(.hidden)').count()) { hintShown = true; break; }
  }
  await page.keyboard.up('w');
  if (!hintShown) throw new Error('hint never appeared while walking');
  await pause(1000);
  await page.keyboard.press('e');
  await page.waitForSelector('#messageOverlay:not(.hidden)', { timeout: 5000 });
  const title = await page.innerText('#msgTitle');
  if (!title.includes('عبدالرحمن')) throw new Error(`wrong letter: ${title}`);
  await pause(VIDEO ? 9000 : 1500);
  await shot('8-fahidi-letter');
  await page.click('#closeMsg');
  await pause(1500);
  // لقطة ختامية: نظرة نحو الفوانيس
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.mouse.move(400, 330, { steps: 25 });
  await page.mouse.up();
  await pause(VIDEO ? 4000 : 800);
  await shot('8-fahidi-world');
});

await context.close();  // يُنهي كتابة الفيديو
await browser.close();

console.log('\n===== النتائج =====');
for (const [n, r] of results) console.log(`${r === 'PASS' ? '✓' : '✗'} ${n} — ${r}`);
const failed = results.filter(([, r]) => r !== 'PASS');
process.exit(failed.length ? 1 : 0);
