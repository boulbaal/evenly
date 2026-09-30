// Maakt promo-screenshots, de demo-GIF en de Product Hunt-galerij voor Evenly.
// Gebruik: npm run db:local && npm run dev        (in een tweede terminal)
//          node tools/promo_shots.mjs              (Engels, tegen http://localhost:8787)
//          SHOT_LANG=nl node tools/promo_shots.mjs  (andere taal: bestanden krijgen -nl; galerij en GIF alleen in het Engels)
//          SHOT_BASE=https://evenly.vanali.workers.dev ...  (tegen de live site; maakt daar een echte demogroep aan)
// Tegen localhost toont de deel-link de echte domeinnaam (alleen de tekst, niets anders).
// De GIF gebruikt ffmpeg; zonder ffmpeg wordt de GIF overgeslagen (met een melding).
import { chromium } from '@playwright/test';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const LIVE = 'https://evenly.vanali.workers.dev';
const BASE = (process.env.SHOT_BASE || 'http://localhost:8787').replace(/\/+$/, '');
const LANG = process.env.SHOT_LANG || 'en';
const SUF = '-' + LANG;
const OUT = 'promo/assets';
const BLAUW = '#1F5FA0';
const T = LANG === 'nl'
  ? { titel: 'Lissabon', locale: 'nl-BE', wat: ['Airbnb Alfama (3 nachten)', 'Boodschappen Pingo Doce', 'Tram 28', 'Pastéis de Belém', 'Huurauto naar Sintra', 'Fado-diner'], nieuw: 'Boottocht bij zonsondergang' }
  : { titel: 'Lisbon trip', locale: LANG === 'en' ? 'en-GB' : LANG, wat: ['Airbnb in Alfama (3 nights)', 'Groceries at Pingo Doce', 'Tram 28 tickets', 'Pastéis de Belém', 'Car rental to Sintra', 'Fado dinner'], nieuw: 'Sunset boat tour' };
const IK = 'Sam';
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
fs.mkdirSync(OUT, { recursive: true });

async function api(pad, method, body) {
  const r = await fetch(BASE + pad, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${pad}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
function dag(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// --- demogroep: 4 mensen, 6 uitgaven (gelijk, deel van de groep, delen 2:1:1, exacte bedragen), 1 betaling ---
async function maakGroep() {
  const g = await api('/api/groups', 'POST', { title: T.titel, name: IK, currency: 'EUR' });
  const id = g.id, sam = g.memberId;
  const lid = async (name) => (await api(`/api/groups/${id}/members`, 'POST', { name })).memberId;
  const priya = await lid('Priya'), tom = await lid('Tom'), lea = await lid('Lea');
  const uit = (b) => api(`/api/groups/${id}/expenses`, 'POST', b);
  await uit({ description: T.wat[0], amount: 48000, paidBy: sam, date: dag(-5), split: 'equal' });
  await uit({ description: T.wat[1], amount: 6340, paidBy: tom, date: dag(-5), split: 'equal' });
  await uit({ description: T.wat[2], amount: 1280, paidBy: priya, date: dag(-4), split: 'equal' });
  // Tom sloeg de pastéis over: gelijk verdeeld onder drie
  await uit({ description: T.wat[3], amount: 1860, paidBy: priya, date: dag(-3), split: 'equal', members: [sam, priya, lea] });
  // Tom hield de auto een dag langer: 2 delen voor hem, 1 voor Sam en Lea
  await uit({ description: T.wat[4], amount: 9600, paidBy: lea, date: dag(-2), split: 'shares', weights: { [tom]: 2, [sam]: 1, [lea]: 1 } });
  await uit({ description: T.wat[5], amount: 11850, paidBy: lea, date: dag(-1), split: 'exact', shares: { [sam]: 3200, [priya]: 2750, [tom]: 3400, [lea]: 2500 } });
  // Priya betaalde Sam al terug via de bank
  await api(`/api/groups/${id}/settlements`, 'POST', { from: priya, to: sam, amount: 5000, date: dag(-1) });
  return { id, sam, priya, tom, lea };
}

// taal, identiteit ("jij" = Sam) en geen installeer-balk
async function context(browser, opts, grp) {
  const ctx = await browser.newContext({ locale: T.locale, deviceScaleFactor: 2, ...opts });
  await ctx.addInitScript(([l, g, m]) => {
    try {
      localStorage.setItem('evenly.lang', l);
      localStorage.setItem('evenly.name', 'Sam');
      localStorage.setItem('evenly.install.dismiss', '1');
      if (g) { localStorage.setItem('evenly.m.' + g, m); localStorage.setItem('evenly.v.' + g, '1'); }
    } catch {}
  }, [LANG, grp ? grp.id : null, grp ? grp.sam : null]);
  return ctx;
}
// localhost -> echte domeinnaam in de deel-link; "vdev", bezoekteller en focusrand weg
async function opschonen(page) {
  await page.evaluate((live) => {
    if (location.origin !== live) {
      for (const n of document.querySelectorAll('.deel *')) {
        for (const c of n.childNodes) if (c.nodeType === 3 && c.textContent.includes(location.origin)) c.textContent = c.textContent.replace(location.origin, live);
      }
    }
    const voet = document.getElementById('voet');
    if (voet) for (const c of voet.childNodes) if (c.nodeType === 3 && /vdev\s*$/.test(c.textContent)) c.textContent = c.textContent.replace(/\s*·\s*vdev\s*$/, '');
    document.getElementById('bezoek')?.classList.add('verborgen');
    document.getElementById('updateBar')?.classList.add('verborgen');
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }, LIVE);
}
async function groepKlaar(page, grp) {
  await page.goto(BASE + '/g/' + grp.id);
  await page.waitForSelector('.transfer');
  await page.waitForTimeout(400);
  await opschonen(page);
}
// scrol zodat het onderste van "wie betaalt wie" net in beeld is (niet verder dan nodig)
async function toonTransfers(page) {
  await page.evaluate(() => {
    const t = document.querySelector('.transfers').getBoundingClientRect();
    const over = t.bottom + 16 - window.innerHeight;
    if (over > 0) window.scrollBy(0, Math.min(over, document.querySelector('.titelrij').getBoundingClientRect().top - 8));
  });
  await page.waitForTimeout(150);
}
// uitgave half ingevuld, splitkeuze "Shares" open
async function formMetDelen(page, grp) {
  await page.fill('#fwat', T.nieuw);
  await page.fill('#fbedrag', '140');
  await page.click('.splitkeuze button[data-split="shares"]');
  await page.fill(`.verdeling input[data-mid="${grp.tom}"]`, '2');
  await opschonen(page);
  await page.waitForTimeout(200);
}
async function clip(page, sels, pad, uit) {
  const box = await page.evaluate((sels) => {
    const r = sels.map((s) => document.querySelector(s).getBoundingClientRect());
    const x = Math.min(...r.map((b) => b.left)), y = Math.min(...r.map((b) => b.top));
    return { x, y, w: Math.max(...r.map((b) => b.right)) - x, h: Math.max(...r.map((b) => b.bottom)) - y };
  }, sels);
  await page.screenshot({ path: uit, clip: { x: box.x - pad, y: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad } });
}

const browser = await chromium.launch({ executablePath: exe, args: ['--lang=' + T.locale], env: { ...process.env, LANG: T.locale.replace('-', '_') + '.UTF-8', LANGUAGE: T.locale.replace('-', '_') } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evenly-promo-'));
try {
  const grp = await maakGroep();
  console.log('demogroep', BASE + '/g/' + grp.id);

  for (const [soort, opts] of [
    ['', { viewport: { width: 1280, height: 800 } }],
    ['-mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const ctx = await context(browser, opts, grp);
    const p = await ctx.newPage();
    // startpagina, met de demogroep onder "je groepen"
    await p.goto(BASE + '/');
    await p.waitForSelector('#titel');
    await p.evaluate(([g, titel]) => {
      try { localStorage.setItem('evenly.recent', JSON.stringify([{ id: g, title: titel, t: Date.now() }])); } catch {}
    }, [grp.id, T.titel]);
    await p.goto(BASE + '/');
    await p.fill('#titel', LANG === 'nl' ? 'Skiweekend' : 'Ski weekend');
    await p.selectOption('#munt', 'EUR');
    await opschonen(p);
    await p.screenshot({ path: `${OUT}/shot-home${SUF}${soort}.png` });

    // groep: saldi + wie betaalt wie
    await groepKlaar(p, grp);
    await toonTransfers(p);
    await p.screenshot({ path: `${OUT}/shot-group${SUF}${soort}.png` });
    if (!soort && LANG === 'en') await clip(p, ['.saldi', '.transfers'], 0, path.join(tmp, 'saldi.png'));

    // uitgave toevoegen met de splitkeuze open
    await p.evaluate(() => window.scrollTo(0, 0));
    await formMetDelen(p, grp);
    await p.evaluate(() => { const f = document.querySelector('.form'); window.scrollTo(0, f.getBoundingClientRect().top + window.scrollY - 16); });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/shot-add-expense${SUF}${soort}.png` });
    await ctx.close();
  }

  if (LANG === 'en') {
    // startpagina in één kolom, voor galerijbeeld 3
    const hctx = await context(browser, { viewport: { width: 760, height: 700 } }, grp);
    const hp = await hctx.newPage();
    await hp.goto(BASE + '/');
    await hp.fill('#titel', 'Ski weekend');
    await hp.selectOption('#munt', 'EUR');
    await opschonen(hp);
    await hp.screenshot({ path: path.join(tmp, 'home-smal.png') });
    await hctx.close();

    await demoGif();
    await galerij(grp.id);
  }
  console.log('klaar:', fs.readdirSync(OUT).join(', '));
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- demo-GIF: uitgave toevoegen -> saldi veranderen -> betaling afvinken (desktop, beide kolommen in beeld) ---
async function demoGif() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.log('ffmpeg ontbreekt: demo-GIF overgeslagen'); return; }
  const grp = await maakGroep();
  const ctx = await context(browser, { viewport: { width: 960, height: 860 }, deviceScaleFactor: 1 }, grp);
  const p = await ctx.newPage();
  await groepKlaar(p, grp);
  // een zichtbare muisaanwijzer (headless tekent er geen)
  await p.evaluate(() => {
    const c = document.createElement('div');
    c.id = 'promo-muis';
    c.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26 L12 16.8 L20 16.8 Z" fill="#1F2933" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 99, pointerEvents: 'none', transition: 'transform .35s ease', transform: 'translate(900px, 820px)' });
    document.body.append(c);
  });
  const muis = async (sel) => {
    const b = await p.locator(sel).first().boundingBox();
    await p.evaluate(([x, y]) => { document.getElementById('promo-muis').style.transform = `translate(${x}px, ${y}px)`; }, [b.x + b.width * 0.6, b.y + b.height * 0.55]);
    await p.waitForTimeout(380);
  };
  const frames = [];
  const shot = async (sec) => {
    const f = path.join(tmp, `f${String(frames.length).padStart(3, '0')}.png`);
    await p.screenshot({ path: f });
    frames.push([f, sec]);
  };
  const typ = async (sel, tekst, stap) => {
    for (let i = stap; i < tekst.length + stap; i += stap) { await p.fill(sel, tekst.slice(0, i)); await shot(0.09); }
  };
  await shot(1.2);
  await muis('#fwat'); await p.focus('#fwat'); await shot(0.3);
  await typ('#fwat', T.nieuw, 3);
  await muis('#fbedrag'); await p.focus('#fbedrag');
  await typ('#fbedrag', '140', 1);
  await shot(0.4);
  await muis('.splitkeuze button[data-split="shares"]');
  await shot(0.3);
  await p.click('.splitkeuze button[data-split="shares"]');
  await shot(0.7);
  const tomVeld = `.verdeling input[data-mid="${grp.tom}"]`;
  await muis(tomVeld); await p.focus(tomVeld);
  await p.fill(tomVeld, '2');
  await shot(1.4);
  await muis('.formknoppen button');
  await shot(0.4);
  await p.locator('.formknoppen button').first().click();
  await p.waitForFunction((t) => [...document.querySelectorAll('.item .wat')].some((e) => e.textContent.includes(t)), T.nieuw);
  await p.waitForTimeout(250);
  await opschonen(p);
  await shot(0.2);
  await muis('.saldi');
  await shot(2.4);
  // eerste "Mark as paid"
  await muis('.transfer button');
  await shot(1.0);
  const voor = await p.locator('.transfer').count();
  await p.locator('.transfer button').first().click();
  await p.waitForFunction((n) => document.querySelectorAll('.transfer').length !== n, voor);
  await p.waitForTimeout(250);
  await opschonen(p);
  await shot(0.5);
  await muis('.saldo:has-text("Tom") .bedrag'); // Tom staat nu op "settled"
  await shot(3.0);
  await ctx.close();

  const lijst = path.join(tmp, 'frames.txt');
  fs.writeFileSync(lijst, frames.map(([f, s]) => `file '${f}'\nduration ${s}`).join('\n') + `\nfile '${frames.at(-1)[0]}'\n`);
  const totaal = frames.reduce((s, [, d]) => s + d, 0);
  const uit = `${OUT}/demo-en.gif`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lijst,
    '-vf', 'fps=12,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', uit]);
  console.log(`demo-en.gif: ${totaal.toFixed(1)} s, ${(fs.statSync(uit).size / 1e6).toFixed(2)} MB`);
}

// --- Product Hunt-galerij, 1270x760 (@2x): kop + screenshot op een rustige achtergrond ---
async function galerij(groepId) {
  const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const css = `
    * { box-sizing: border-box; }
    body { margin: 0; width: 1270px; height: 760px; overflow: hidden; position: relative; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1F2933; background: #EEF4FA; }
    h1 { font-size: 62px; line-height: 1.06; margin: 0; letter-spacing: -.02em; }
    .accent { color: ${BLAUW}; font-weight: 800; }
    .sub { color: #4A5561; font-size: 25px; line-height: 1.45; margin: 0; }
    .url { color: ${BLAUW}; font-weight: 700; font-size: 26px; }
    .tekst { position: absolute; left: 72px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
    .venster { position: absolute; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(31,41,51,.18); overflow: hidden; }
    .balk { height: 38px; background: #F3F5F7; border-bottom: 1px solid #E3E7EB; display: flex; align-items: center; gap: 8px; padding: 0 14px; }
    .balk i { width: 12px; height: 12px; border-radius: 50%; background: #D5DADF; display: block; }
    .balk span { margin-left: 14px; background: #fff; border: 1px solid #E3E7EB; border-radius: 7px; padding: 3px 12px; font-size: 14px; color: #4A5561; flex: 1; }
    img { display: block; }
    .telefoon { position: absolute; border-radius: 44px; background: #fff; padding: 12px; box-shadow: 0 24px 60px rgba(31,41,51,.20); }
    .telefoon .scherm { border-radius: 32px; overflow: hidden; }
  `;
  const pagina = async (naam, html) => {
    const ctx = await browser.newContext({ viewport: { width: 1270, height: 760 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${naam}` });
    await ctx.close();
  };
  const balk = (u) => `<div class="balk"><i></i><i></i><i></i><span>${u}</span></div>`;

  // 1: saldi + wie betaalt wie, groot
  await pagina('ph-gallery-1-group.png', `
    <div class="tekst" style="width:540px">
      <h1>Who owes whom, <span class="accent">in the fewest payments.</span></h1>
      <p class="sub">Add what everyone spent. Evenly keeps the balances and shows each person whom to pay. One tap on "Mark as paid" updates it for everyone.</p>
    </div>
    <div class="venster" style="left:668px; top:56px; width:530px">
      ${balk('evenly.vanali.workers.dev/g/' + groepId)}
      <div style="padding:20px 24px 24px"><img src="${b64(path.join(tmp, 'saldi.png'))}" style="width:482px"></div>
    </div>`);

  // 2: telefoon + tagline (zoals Whenly)
  await pagina('ph-gallery-2-mobile.png', `
    <div class="tekst" style="width:640px; gap:26px">
      <h1 style="font-size:64px">Split costs<br>with your group.</h1>
      <div class="accent" style="font-size:40px">No account. No ads. Free.</div>
      <p class="sub">One link for the whole group. Split equally, by shares or exact amounts. 23 languages, 60+ currencies.</p>
      <div class="url" style="margin-top:30px">evenly.vanali.workers.dev</div>
    </div>
    <div class="telefoon" style="right:110px; top:34px; width:360px">
      <div class="scherm" style="height:668px"><img src="${b64(`${OUT}/shot-group-en-mobile.png`)}" style="width:336px"></div>
    </div>`);

  // 3: startpagina
  await pagina('ph-gallery-3-home.png', `
    <div class="tekst" style="width:500px">
      <h1 style="font-size:56px">Start a group in ten seconds.</h1>
      <p class="sub">A name for the group, your name, a currency. Share the link. Nobody signs up, not even you.</p>
      <p class="sub" style="font-size:21px; color:#5B6570">Free and open source. No ads, no tracking. Groups left untouched for 12 months are deleted.</p>
    </div>
    <div class="venster" style="left:632px; top:88px; width:578px; height:584px">
      ${balk('evenly.vanali.workers.dev')}
      <img src="${b64(path.join(tmp, 'home-smal.png'))}" style="width:578px">
    </div>`);
}
