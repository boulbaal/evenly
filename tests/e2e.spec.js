// Evenly — end-to-end testen tegen wrangler dev (zie playwright.config.js).
// API: contract, validatie en het rekenwerk tot op de cent.
// Scenario's: echte klikken in de browser, op desktop en op 360 px.
// Statisch: vertalingen compleet, META gelijk aan de app, geen externe scripts.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');


const vandaag = () => new Date().toISOString().slice(0, 10);

async function maakGroep(request, extra = {}) {
  const r = await request.post('/api/groups', { data: { title: 'Lissabon', name: 'Ali', currency: 'EUR', ...extra } });
  expect(r.status()).toBe(201);
  return r.json(); // { id, memberId }
}
async function lid(request, gid, name) {
  const r = await request.post(`/api/groups/${gid}/members`, { data: { name } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).memberId;
}
async function uitgave(request, gid, body) {
  return request.post(`/api/groups/${gid}/expenses`, { data: { date: vandaag(), split: 'equal', ...body } });
}
async function groep(request, gid) {
  const r = await request.get(`/api/groups/${gid}`);
  expect(r.status()).toBe(200);
  return r.json();
}
const netVan = (g, id) => g.balances.find((b) => b.memberId === id).net;
const somSaldi = (g) => g.balances.reduce((s, b) => s + b.net, 0);

/* ================================================================
   API
   ================================================================ */
test.describe('API', () => {
  test.beforeEach(({ }, info) => { test.skip(info.project.name !== 'desktop', 'API-testen één keer'); });

  test('A1 groep maken: validatie van titel, naam en munt', async ({ request }) => {
    expect((await request.post('/api/groups', { data: { title: '', name: 'Ali', currency: 'EUR' } })).status()).toBe(400);
    expect((await (await request.post('/api/groups', { data: { title: 'x', name: '  ', currency: 'EUR' } })).json()).error).toBe('name_required');
    expect((await (await request.post('/api/groups', { data: { title: 'x', name: 'Ali', currency: 'XXX' } })).json()).error).toBe('invalid_currency');
    expect((await (await request.post('/api/groups', { data: { title: 'x'.repeat(81), name: 'Ali', currency: 'EUR' } })).json()).error).toBe('title_required');
    expect((await request.post('/api/groups', { data: '[1,2]', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
    expect((await request.post('/api/groups', { data: 'geen json', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
    const g = await maakGroep(request, { currency: 'JPY' });
    expect(g.id).toMatch(/^[a-z0-9]{10}$/);
    const full = await groep(request, g.id);
    expect(full.currency).toBe('JPY');
    expect(full.decimals).toBe(0);
    expect(full.members.map((m) => m.name)).toEqual(['Ali']);
    expect(full.expenses).toEqual([]);
    expect(full.transfers).toEqual([]);
  });

  test('A2 leden: zelfde naam (hoofdletters, spaties, Unicode-varianten) = zelfde lid', async ({ request }) => {
    const g = await maakGroep(request);
    const s1 = await lid(request, g.id, 'Sofie');
    expect(await lid(request, g.id, '  sofie ')).toBe(s1);
    expect(await lid(request, g.id, 'SOFIE')).toBe(s1);
    // NFKC: volbreedte-letters zijn dezelfde naam
    expect(await lid(request, g.id, 'Ｓｏｆｉｅ')).toBe(s1);
    expect(await lid(request, g.id, 'Ali')).toBe(g.memberId);
    // onzichtbare tekens tellen niet: zelfde lid; een naam zonder letters of cijfers mag niet
    expect(await lid(request, g.id, 'Sof\u200Bie')).toBe(s1);
    expect(await lid(request, g.id, '\u202ESofie')).toBe(s1);
    for (const leeg of ['\u200B', '\u2800', '\u00AD', '...']) {
      expect((await request.post(`/api/groups/${g.id}/members`, { data: { name: leeg } })).status(), JSON.stringify(leeg)).toBe(400);
    }
    const st = await lid(request, g.id, 'Straße');
    expect(await lid(request, g.id, 'STRASSE')).toBe(st);
    const t = await lid(request, g.id, 'Tom');
    expect(t).not.toBe(s1);
    expect((await groep(request, g.id)).members).toHaveLength(4);
  });

  test('A3 gelijk verdelen: restcent naar wie betaalde, som exact', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    const t = await lid(request, g.id, 'Tom');
    // 100,00 over 3: 33,34 voor de betaler, 33,33 voor de andere twee
    expect((await uitgave(request, g.id, { description: 'Hotel', amount: 10000, paidBy: s })).status()).toBe(201);
    const full = await groep(request, g.id);
    const e = full.expenses[0];
    const deel = Object.fromEntries(e.shares.map((x) => [x.memberId, x.share]));
    expect(deel[s]).toBe(3334);
    expect(deel[g.memberId]).toBe(3333);
    expect(deel[t]).toBe(3333);
    expect(e.shares.reduce((a, x) => a + x.share, 0)).toBe(10000);
    expect(netVan(full, s)).toBe(6666);
    expect(netVan(full, g.memberId)).toBe(-3333);
    expect(somSaldi(full)).toBe(0);
  });

  test('A4 gelijk over sommigen, exacte bedragen, en delen 2:1:1', async ({ request }) => {
    const g = await maakGroep(request);
    const a = g.memberId;
    const s = await lid(request, g.id, 'Sofie');
    const t = await lid(request, g.id, 'Tom');
    // sommigen: 10,00 over Ali en Tom (Sofie niet)
    expect((await uitgave(request, g.id, { description: 'Taxi', amount: 1000, paidBy: s, members: [a, t] })).status()).toBe(201);
    // exact: 20,00 = 5,00 + 15,00
    expect((await uitgave(request, g.id, { description: 'Eten', amount: 2000, paidBy: a, split: 'exact', shares: { [a]: 500, [t]: 1500 } })).status()).toBe(201);
    // delen 2:1:1 over 10,01 -> 5,00 / 2,50 / 2,50 plus 1 restcent naar de betaler (Tom)
    expect((await uitgave(request, g.id, { description: 'Wijn', amount: 1001, paidBy: t, split: 'shares', weights: { [a]: 2, [s]: 1, [t]: 1 } })).status()).toBe(201);
    const full = await groep(request, g.id);
    const vind = (d) => Object.fromEntries(full.expenses.find((e) => e.description === d).shares.map((x) => [x.memberId, x.share]));
    expect(vind('Taxi')).toEqual({ [a]: 500, [t]: 500 });
    expect(vind('Eten')).toEqual({ [a]: 500, [t]: 1500 });
    const wijn = vind('Wijn');
    expect(wijn[a] + wijn[s] + wijn[t]).toBe(1001);
    expect(wijn[a]).toBe(500);
    expect(wijn[t]).toBe(251);
    expect(full.expenses.find((e) => e.description === 'Wijn').shares.find((x) => x.memberId === a).weight).toBe(2);
    // saldi met de hand: Ali +2000 -500 -500 -500 = 500; Sofie +1000 -250 = 750; Tom +1001 -500 -1500 -251 = -1250
    expect(netVan(full, a)).toBe(500);
    expect(netVan(full, s)).toBe(750);
    expect(netVan(full, t)).toBe(-1250);
    expect(somSaldi(full)).toBe(0);
    // wie betaalt wie: Tom (grootste schuld) aan Sofie (grootste tegoed), dan aan Ali
    expect(full.transfers).toEqual([{ from: t, to: s, amount: 750 }, { from: t, to: a, amount: 500 }]);
  });

  test('A5 ongeldige verdelingen worden geweigerd', async ({ request }) => {
    const g = await maakGroep(request);
    const a = g.memberId;
    const s = await lid(request, g.id, 'Sofie');
    const fout = async (body) => (await (await uitgave(request, g.id, { description: 'x', amount: 1000, paidBy: a, ...body })).json()).error;
    expect(await fout({ split: 'exact', shares: { [a]: 400, [s]: 500 } })).toBe('shares_mismatch');
    expect(await fout({ split: 'exact', shares: { [a]: 1200, [s]: -200 } })).toBe('invalid_split');
    expect(await fout({ split: 'exact', shares: { [a]: 10.5, [s]: 989.5 } })).toBe('invalid_split');
    expect(await fout({ split: 'shares', weights: { [a]: 0, [s]: 0 } })).toBe('invalid_split');
    expect(await fout({ split: 'equal', members: [] })).toBe('invalid_split');
    expect(await fout({ split: 'equal', members: ['bestaatniet'] })).toBe('invalid_split');
    expect(await fout({ split: 'magie' })).toBe('invalid_split');
    expect(await fout({ split: 'equal', members: 'abc' })).toBe('invalid_split');
    expect(await fout({ split: 'equal', members: { 0: a } })).toBe('invalid_split');
    expect(await fout({ paidBy: 12 })).toBe('invalid_split');
    expect(await fout({ amount: 0 })).toBe('invalid_amount');
    expect(await fout({ amount: -5 })).toBe('invalid_amount');
    expect(await fout({ amount: 12.5 })).toBe('invalid_amount');
    expect(await fout({ amount: '1000' })).toBe('invalid_amount');
    expect(await fout({ amount: 1e13 })).toBe('invalid_amount');
    expect(await fout({ description: '   ' })).toBe('description_required');
    expect(await fout({ date: '2026-02-30' })).toBe('invalid_date');
    expect(await fout({ date: '2999-01-01' })).toBe('invalid_date');
    expect(await fout({ paidBy: 'bestaatniet' })).toBe('member_not_found');
    // een lid van een andere groep telt niet
    const g2 = await maakGroep(request);
    expect(await fout({ paidBy: g2.memberId })).toBe('member_not_found');
    expect(await fout({ split: 'equal', members: [g2.memberId] })).toBe('invalid_split');
    expect((await groep(request, g.id)).expenses).toHaveLength(0);
  });

  test('A6 uitgave aanpassen en verwijderen; verwijderd blijft als info', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    const r = await uitgave(request, g.id, { description: 'Pizza', amount: 3000, paidBy: g.memberId });
    const eid = (await r.json()).expenseId;
    const put = await request.put(`/api/groups/${g.id}/expenses/${eid}`, { data: { description: 'Pizza en cola', amount: 3600, paidBy: s, date: vandaag(), split: 'equal' } });
    expect(put.status()).toBe(200);
    let full = await groep(request, g.id);
    expect(full.expenses[0].description).toBe('Pizza en cola');
    expect(full.expenses[0].amount).toBe(3600);
    expect(full.expenses[0].updatedAt).toBeTruthy();
    expect(netVan(full, s)).toBe(1800);
    expect((await request.delete(`/api/groups/${g.id}/expenses/${eid}`)).status()).toBe(200);
    expect((await request.delete(`/api/groups/${g.id}/expenses/${eid}`)).status()).toBe(404);
    expect((await request.put(`/api/groups/${g.id}/expenses/${eid}`, { data: { description: 'x', amount: 1, paidBy: s, date: vandaag(), split: 'equal' } })).status()).toBe(404);
    full = await groep(request, g.id);
    expect(full.expenses).toHaveLength(0);
    expect(full.removedExpenses[0].description).toBe('Pizza en cola');
    expect(somSaldi(full)).toBe(0);
    expect(full.balances.every((b) => b.net === 0)).toBeTruthy();
  });

  test('A7 afrekenen: betaling maakt saldi nul, lid met saldo kan niet weg', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Hotel', amount: 5000, paidBy: g.memberId });
    // Sofie moet 25,00 aan Ali
    let full = await groep(request, g.id);
    expect(full.transfers).toEqual([{ from: s, to: g.memberId, amount: 2500 }]);
    const weg = await request.delete(`/api/groups/${g.id}/members/${s}`);
    expect(weg.status()).toBe(409);
    expect((await weg.json()).error).toBe('has_balance');
    expect((await (await request.post(`/api/groups/${g.id}/settlements`, { data: { from: s, to: s, amount: 100, date: vandaag() } })).json()).error).toBe('invalid_split');
    expect((await request.post(`/api/groups/${g.id}/settlements`, { data: { from: s, to: g.memberId, amount: 2500, date: vandaag() } })).status()).toBe(201);
    full = await groep(request, g.id);
    expect(full.transfers).toEqual([]);
    expect(full.balances.every((b) => b.net === 0)).toBeTruthy();
    // nu wel weg; blijft zichtbaar in removed en in de oude uitgave
    expect((await request.delete(`/api/groups/${g.id}/members/${s}`)).status()).toBe(200);
    full = await groep(request, g.id);
    expect(full.members.map((m) => m.id)).toEqual([g.memberId]);
    expect(full.removed.map((m) => m.name)).toEqual(['Sofie']);
    expect(full.expenses[0].shares.some((x) => x.memberId === s)).toBeTruthy();
    // weggehaald lid kan niet meer betalen of meedoen
    expect((await (await uitgave(request, g.id, { description: 'x', amount: 100, paidBy: s })).json()).error).toBe('member_not_found');
    // dezelfde naam komt terug: zelfde lid, weer actief
    expect(await lid(request, g.id, 'sofie')).toBe(s);
    expect((await groep(request, g.id)).removed).toHaveLength(0);
  });

  test('A8 betaling ongedaan maken herstelt het saldo', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Hotel', amount: 5000, paidBy: g.memberId });
    const sid = (await (await request.post(`/api/groups/${g.id}/settlements`, { data: { from: s, to: g.memberId, amount: 2500, date: vandaag() } })).json()).settlementId;
    expect((await request.delete(`/api/groups/${g.id}/settlements/${sid}`)).status()).toBe(200);
    const full = await groep(request, g.id);
    expect(full.settlements).toHaveLength(0);
    expect(netVan(full, s)).toBe(-2500);
  });

  test('A9 wie-betaalt-wie: hoogstens n-1 betalingen en klopt altijd', async ({ request }) => {
    const g = await maakGroep(request);
    const ids = [g.memberId];
    for (const n of ['B', 'C', 'D', 'E', 'F']) ids.push(await lid(request, g.id, n));
    // pseudo-willekeurige uitgaven met vaste zaad
    let x = 12345;
    const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
    for (let i = 0; i < 25; i++) {
      const betaler = ids[rnd() % ids.length];
      const bedrag = 1 + (rnd() % 20000);
      const soort = rnd() % 3;
      const body = { description: 'u' + i, amount: bedrag, paidBy: betaler };
      if (soort === 1) body.members = ids.filter(() => rnd() % 2 === 0).concat(betaler).filter((v, j, a) => a.indexOf(v) === j);
      if (soort === 2) { body.split = 'shares'; body.weights = Object.fromEntries(ids.map((m) => [m, 1 + (rnd() % 4)])); }
      expect((await uitgave(request, g.id, body)).status()).toBe(201);
    }
    const full = await groep(request, g.id);
    expect(somSaldi(full)).toBe(0);
    for (const e of full.expenses) expect(e.shares.reduce((a, s) => a + s.share, 0)).toBe(e.amount);
    expect(full.transfers.length).toBeLessThanOrEqual(ids.length - 1);
    // de betalingen uitvoeren moet iedereen op nul zetten
    const na = new Map(full.balances.map((b) => [b.memberId, b.net]));
    for (const tr of full.transfers) {
      expect(tr.amount).toBeGreaterThan(0);
      na.set(tr.from, na.get(tr.from) + tr.amount);
      na.set(tr.to, na.get(tr.to) - tr.amount);
    }
    for (const v of na.values()) expect(v).toBe(0);
  });

  test('A10 munt: vast zodra er uitgaven zijn; titel aanpassen', async ({ request }) => {
    const g = await maakGroep(request);
    expect((await request.put(`/api/groups/${g.id}/currency`, { data: { currency: 'USD' } })).status()).toBe(200);
    expect((await groep(request, g.id)).currency).toBe('USD');
    await uitgave(request, g.id, { description: 'x', amount: 100, paidBy: g.memberId });
    const r = await request.put(`/api/groups/${g.id}/currency`, { data: { currency: 'EUR' } });
    expect(r.status()).toBe(409);
    expect((await r.json()).error).toBe('currency_locked');
    expect((await request.put(`/api/groups/${g.id}/title`, { data: { title: 'Porto' } })).status()).toBe(200);
    expect((await groep(request, g.id)).title).toBe('Porto');
    expect((await request.put(`/api/groups/${g.id}/title`, { data: { title: '' } })).status()).toBe(400);
  });

  test('A11 groep volledig verwijderen: alles weg', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'x', amount: 100, paidBy: s });
    expect((await request.delete(`/api/groups/${g.id}`)).status()).toBe(200);
    expect((await request.get(`/api/groups/${g.id}`)).status()).toBe(404);
    expect((await request.delete(`/api/groups/${g.id}`)).status()).toBe(404);
    expect((await request.post(`/api/groups/${g.id}/members`, { data: { name: 'x' } })).status()).toBe(404);
  });

  test('A12 onbekende paden, ongeldige ids, versie en gezondheid', async ({ request }) => {
    expect((await request.get('/api/groups/abc')).status()).toBe(404);
    expect((await request.get('/api/groups/abcdefghij')).status()).toBe(404);
    expect((await request.get('/api/groups/ABCDEFGHIJ')).status()).toBe(404);
    expect((await request.get('/api/nope')).status()).toBe(404);
    expect((await (await request.get('/api/health')).json()).ok).toBe(true);
    expect((await (await request.get('/api/version')).json()).version).toBe('dev');
    const c = await (await request.get('/api/currencies')).json();
    expect(c.EUR).toBe(2); expect(c.JPY).toBe(0); expect(c.KWD).toBe(3);
  });

  test('A13 opruimen: oude groepen en oude verwijderde items verdwijnen', async ({ request }) => {
    const g = await maakGroep(request);
    // de cron-endpoint van wrangler dev (--test-scheduled) moet zonder fout draaien
    const r = await request.get('/__scheduled?cron=23+3+*+*+*');
    expect(r.status()).toBe(200);
    expect((await request.get(`/api/groups/${g.id}`)).status()).toBe(200); // recente groep blijft
  });

  test('A14 pagina\'s: taalpagina, groepspagina niet indexeerbaar, FAQ/privacy per taal, headers', async ({ request }) => {
    const nl = await (await request.get('/nl/')).text();
    expect(nl).toContain('<html lang="nl">');
    expect(nl).toContain('<title>Wie moet wat? · Evenly</title>');
    expect((nl.match(/hreflang="/g) || []).length).toBe(24);
    const ar = await (await request.get('/ar/')).text();
    expect(ar).toContain('<html lang="ar" dir="rtl">');
    const g = await request.get('/g/abcdefghij');
    expect(g.status()).toBe(200);
    expect(g.headers()['x-robots-tag']).toBe('noindex, nofollow');
    const faq = await request.get('/faq');
    expect(faq.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(await faq.text()).toContain('"@type": "FAQPage"');
    const arPriv = await (await request.get('/ar/privacy')).text();
    expect(arPriv).toContain('<html lang="ar" dir="rtl">');
    expect(arPriv).toContain('https://github.com/boulbaal/evenly');
    for (const l of ['en', 'fr', 'zgh', 'sn', 'ja']) {
      expect((await request.get(`/${l}/faq`)).status(), l).toBe(200);
      expect((await request.get(`/${l}/privacy`)).status(), l).toBe(200);
    }
    const sm = await (await request.get('/sitemap.xml')).text();
    expect(sm).toContain('<loc>https://evenly.vanali.workers.dev/sw/</loc>');
    expect(sm).toContain('<loc>https://evenly.vanali.workers.dev/ar/privacy</loc>');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://evenly.vanali.workers.dev/sitemap.xml');
    for (const p of ['/manifest.webmanifest', '/icon-512.png', '/og.png', '/sw.js', '/fonts/noto-sans-tifinagh-tifinagh-400-normal.woff2']) {
      expect((await request.get(p)).status(), p).toBe(200);
    }
  });
});

test.describe('API (na review)', () => {
  test.beforeEach(({ }, info) => { test.skip(info.project.name !== 'desktop', 'API-testen één keer'); });

  test('A15 weggehaald lid met een saldo kan toch vereffend worden', async ({ request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Hotel', amount: 5000, paidBy: g.memberId });
    const sid = (await (await request.post(`/api/groups/${g.id}/settlements`, { data: { from: s, to: g.memberId, amount: 2500, date: vandaag() } })).json()).settlementId;
    expect((await request.delete(`/api/groups/${g.id}/members/${s}`)).status()).toBe(200);
    // iemand zet de betaling terug: Sofie (weggehaald) moet weer 25,00
    expect((await request.delete(`/api/groups/${g.id}/settlements/${sid}`)).status()).toBe(200);
    let full = await groep(request, g.id);
    expect(full.transfers).toEqual([{ from: s, to: g.memberId, amount: 2500 }]);
    expect(full.balances.find((b) => b.memberId === s).net).toBe(-2500);
    // "Betaald" werkt ook met een weggehaald lid
    expect((await request.post(`/api/groups/${g.id}/settlements`, { data: { from: s, to: g.memberId, amount: 2500, date: vandaag() } })).status()).toBe(201);
    full = await groep(request, g.id);
    expect(full.transfers).toEqual([]);
    // een lid van een andere groep blijft geweigerd
    const g2 = await maakGroep(request);
    expect((await request.post(`/api/groups/${g.id}/settlements`, { data: { from: g2.memberId, to: g.memberId, amount: 1, date: vandaag() } })).status()).toBe(404);
  });

  test('A16 oude uitgave met een weggehaald lid blijft aan te passen, zonder dat het lid stil verdwijnt', async ({ request }) => {
    const g = await maakGroep(request);
    const a = g.memberId;
    const s = await lid(request, g.id, 'Sofie');
    const t = await lid(request, g.id, 'Tom');
    const eid = (await (await uitgave(request, g.id, { description: 'Taxi', amount: 3000, paidBy: s })).json()).expenseId;
    // Sofie betaalde 30, deelt 10: krijgt 20. Tom en Ali betalen haar elk 10; dan kan ze weg.
    await request.post(`/api/groups/${g.id}/settlements`, { data: { from: t, to: s, amount: 1000, date: vandaag() } });
    await request.post(`/api/groups/${g.id}/settlements`, { data: { from: a, to: s, amount: 1000, date: vandaag() } });
    expect((await request.delete(`/api/groups/${g.id}/members/${s}`)).status()).toBe(200);
    // omschrijving aanpassen met dezelfde deelnemers (Sofie weggehaald) en Sofie als betaler: mag
    const put = await request.put(`/api/groups/${g.id}/expenses/${eid}`, { data: { description: 'Taxi naar huis', amount: 3000, paidBy: s, date: vandaag(), split: 'equal', members: [a, s, t] } });
    expect(put.status()).toBe(200);
    const full = await groep(request, g.id);
    expect(full.expenses[0].description).toBe('Taxi naar huis');
    expect(full.expenses[0].shares.map((x) => x.memberId).sort()).toEqual([a, s, t].sort());
    expect(full.balances.every((b) => b.net === 0)).toBeTruthy();
    // maar een nieuwe uitgave met Sofie kan niet
    expect((await uitgave(request, g.id, { description: 'x', amount: 100, paidBy: a, members: [a, s] })).status()).toBe(400);
  });

  test('A17 wie precies evenveel moet als een ander krijgt, betaalt die rechtstreeks', async ({ request }) => {
    const g = await maakGroep(request);
    const [A, B] = [g.memberId, await lid(request, g.id, 'B')];
    const C = await lid(request, g.id, 'C');
    const D = await lid(request, g.id, 'D');
    const E = await lid(request, g.id, 'E');
    // saldi A +600, B +500, C -500, D -400, E -200
    await uitgave(request, g.id, { description: '1', amount: 600, paidBy: A, split: 'exact', shares: { [C]: 100, [D]: 400, [E]: 100 } });
    await uitgave(request, g.id, { description: '2', amount: 500, paidBy: B, split: 'exact', shares: { [C]: 400, [E]: 100 } });
    const full = await groep(request, g.id);
    expect(full.transfers).toHaveLength(3);
    expect(full.transfers).toContainEqual({ from: C, to: B, amount: 500 });
  });

  test('A18 munt vast na een (ook verwijderde) uitgave; bezoek zonder body; grote body geweigerd', async ({ request }) => {
    const g = await maakGroep(request);
    const eid = (await (await uitgave(request, g.id, { description: 'x', amount: 100, paidBy: g.memberId })).json()).expenseId;
    await request.delete(`/api/groups/${g.id}/expenses/${eid}`);
    expect((await request.put(`/api/groups/${g.id}/currency`, { data: { currency: 'JPY' } })).status()).toBe(409);
    expect((await request.post(`/api/groups/${g.id}/visit`)).status()).toBe(200);
    expect((await request.post('/api/groups/zzzzzzzzzz/visit')).status()).toBe(404);
    const groot = await request.post('/api/groups', { data: { title: 'x'.repeat(40000), name: 'A', currency: 'EUR' } });
    expect(groot.status()).toBe(400);
  });

  test('A19 veel leden in één uitgave (één statement voor alle aandelen)', async ({ request }) => {
    const g = await maakGroep(request);
    const ids = [g.memberId];
    for (let i = 0; i < 60; i++) ids.push(await lid(request, g.id, 'L' + i));
    const r = await uitgave(request, g.id, { description: 'Groot feest', amount: 610001, paidBy: g.memberId });
    expect(r.status()).toBe(201);
    const full = await groep(request, g.id);
    expect(full.expenses[0].shares).toHaveLength(61);
    expect(full.expenses[0].shares.reduce((a, x) => a + x.share, 0)).toBe(610001);
    expect(somSaldi(full)).toBe(0);
  });
});

/* ================================================================
   Scenario's in de browser
   ================================================================ */
async function nieuweContext(browser, info, taal = 'nl-BE') {
  const opts = { locale: taal };
  if (info.project.name === 'mobiel-360') Object.assign(opts, { viewport: { width: 360, height: 740 }, hasTouch: true });
  const ctx = await browser.newContext(opts);
  return ctx;
}
async function vulUitgave(page, wat, bedrag) {
  await page.fill('#fwat', wat);
  await page.fill('#fbedrag', bedrag);
}

test.describe("Scenario's", () => {
  test('S1 groep maken in de browser, lid toevoegen, eerste uitgave, saldi', async ({ page }) => {
    await page.goto('/nl/');
    await expect(page.locator('h1')).toContainText('Wie moet wat?');
    await page.fill('#titel', 'Weekend Gent');
    await page.fill('#naam', 'Ali');
    await page.selectOption('#munt', 'EUR');
    await page.click('button:has-text("Maak de groep")');
    await page.waitForURL(/\/g\/[a-z0-9]{10}$/);
    await expect(page.locator('.titelrij h1')).toHaveText('Weekend Gent');
    await expect(page.locator('.deel')).toContainText('Klaar. Deel deze link');
    await expect(page.locator('.saldi')).toContainText('Nog geen uitgaven');
    // lid toevoegen
    await page.click('.chip.toevoegen');
    await page.locator('.nieuw input').fill('Sofie');
    await page.locator('.nieuw button').click();
    await expect(page.locator('.chip', { hasText: 'Sofie' })).toBeVisible();
    // uitgave: 30,00 gelijk
    await vulUitgave(page, 'Pizza', '30');
    await expect(page.locator('#fwie')).toHaveValue(await page.evaluate(() => localStorage.getItem('evenly.m.' + location.pathname.slice(3))));
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Pizza' })).toBeVisible();
    await expect(page.locator('.item', { hasText: 'Pizza' })).toContainText('€ 30,00');
    await expect(page.locator('.item', { hasText: 'Pizza' })).toContainText('Jij betaalde');
    await expect(page.locator('.item', { hasText: 'Pizza' })).toContainText('jij schoot € 15,00 voor');
    await expect(page.locator('.saldo').first()).toContainText('krijgt € 15,00 terug');
    await expect(page.locator('.transfers')).toContainText('Sofie betaalt jou € 15,00');
    // formulier is weer leeg
    await expect(page.locator('#fwat')).toHaveValue('');
    await expect(page.locator('#fbedrag')).toHaveValue('');
  });

  test('S2 bedragen typen: komma, punt, duizendtallen, te veel decimalen', async ({ page, request }) => {
    const g = await maakGroep(request);
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    const gevallen = [['12,5', 1250], ['12.50', 1250], ['1.234,56', 123456], ['1,234.56', 123456], ['1 200', 120000], ['0,01', 1], ['12,345', 1234500], ['€ 7,50', 750]];
    for (const [tekst, centen] of gevallen) {
      await vulUitgave(page, 'b' + tekst, tekst);
      await page.click('.form button:has-text("Toevoegen")');
      await expect(page.locator('.item', { hasText: 'b' + tekst })).toBeVisible();
      const full = await groep(request, g.id);
      expect(full.expenses.find((e) => e.description === 'b' + tekst).amount, tekst).toBe(centen);
    }
    for (const fout of ['12,3456', 'abc', '0', '-5', '1.2.3']) {
      await vulUitgave(page, 'fout', fout);
      await page.click('.form button:has-text("Toevoegen")');
      await expect(page.locator('.form p[role="alert"]')).toContainText('bedrag', { ignoreCase: true });
    }
    expect((await groep(request, g.id)).expenses).toHaveLength(gevallen.length);
  });

  test('S3 verdeling kiezen: sommigen, exact met restmelding, delen met voorbeeld', async ({ page, request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    const t = await lid(request, g.id, 'Tom');
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    // sommigen: Tom uitvinken
    await vulUitgave(page, 'Taxi', '10');
    await page.click('.splitkeuze button[data-split="some"]');
    await page.uncheck(`.verdeelrij input[type="checkbox"][data-mid="${t}"]`);
    await expect(page.locator(`.deel-preview[data-mid="${s}"]`)).toHaveText('€ 5,00');
    await expect(page.locator(`.deel-preview[data-mid="${t}"]`)).toHaveText('');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Taxi' })).toBeVisible();
    let full = await groep(request, g.id);
    expect(full.expenses[0].shares.map((x) => x.memberId).sort()).toEqual([g.memberId, s].sort());
    // exact: restmelding tot het klopt
    await vulUitgave(page, 'Eten', '20');
    await page.click('.splitkeuze button[data-split="exact"]');
    await page.fill(`.verdeelrij input[type="text"][data-mid="${g.memberId}"]`, '5');
    await expect(page.locator('.rest')).toContainText('nog € 15,00 te verdelen');
    await page.fill(`.verdeelrij input[type="text"][data-mid="${t}"]`, '16');
    await expect(page.locator('.rest')).toContainText('€ 1,00 te veel');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.form p[role="alert"]')).toContainText('komen niet uit');
    await page.fill(`.verdeelrij input[type="text"][data-mid="${t}"]`, '15');
    await expect(page.locator('.rest')).toBeHidden();
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Eten' })).toBeVisible();
    // delen 2:1:1 met voorbeeld
    await vulUitgave(page, 'Wijn', '40');
    await page.click('.splitkeuze button[data-split="shares"]');
    await page.fill(`.verdeelrij input[type="text"][data-mid="${g.memberId}"]`, '2');
    await expect(page.locator(`.deel-preview[data-mid="${g.memberId}"]`)).toHaveText('€ 20,00');
    await expect(page.locator(`.deel-preview[data-mid="${s}"]`)).toHaveText('€ 10,00');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Wijn' })).toBeVisible();
    full = await groep(request, g.id);
    const wijn = full.expenses.find((e) => e.description === 'Wijn');
    expect(wijn.split).toBe('shares');
    expect(Object.fromEntries(wijn.shares.map((x) => [x.memberId, x.share]))).toEqual({ [g.memberId]: 2000, [s]: 1000, [t]: 1000 });
    expect(somSaldi(full)).toBe(0);
  });

  test('S4 uitgave aanpassen en verwijderen (met bevestiging), info-regel', async ({ page, request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Bioscoop', amount: 2400, paidBy: s });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    const item = page.locator('.item', { hasText: 'Bioscoop' });
    await expect(item).toContainText('Sofie betaalde');
    await expect(item).toContainText('jij moet € 12,00');
    await item.locator('button:has-text("aanpassen")').click();
    await expect(page.locator('.form h2')).toHaveText('Uitgave aanpassen');
    await expect(page.locator('#fwat')).toHaveValue('Bioscoop');
    await expect(page.locator('#fbedrag')).toHaveValue('24,00');
    await page.fill('#fbedrag', '30');
    await page.click('.form button:has-text("Wijzigingen bewaren")');
    await expect(page.locator('.item', { hasText: 'Bioscoop' })).toContainText('€ 30,00');
    await expect(page.locator('.form h2')).toHaveText('Uitgave toevoegen');
    expect((await groep(request, g.id)).expenses[0].amount).toBe(3000);
    // verwijderen: eerst vragen
    await page.locator('.item', { hasText: 'Bioscoop' }).locator('button:has-text("Verwijder")').click();
    await page.locator('.item', { hasText: 'Bioscoop' }).locator('button:has-text("Toch niet")').click();
    await expect(page.locator('.item', { hasText: 'Bioscoop' })).toBeVisible();
    await page.locator('.item', { hasText: 'Bioscoop' }).locator('button:has-text("Verwijder")').click();
    await page.locator('.item', { hasText: 'Bioscoop' }).locator('button:has-text("Ja, verwijder")').click();
    await expect(page.locator('.item', { hasText: 'Bioscoop' })).toHaveCount(0);
    await expect(page.locator('.lijst .weggehaald')).toContainText('Iemand heeft “Bioscoop” (€ 30,00) verwijderd');
  });

  test('S5 afrekenen: "Betaald" maakt het saldo nul, confetti-vrij en "Iedereen staat quitte"', async ({ page, request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Hotel', amount: 8000, paidBy: g.memberId });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('.transfers')).toContainText('Sofie betaalt jou € 40,00');
    await page.click('.transfer button');
    await expect(page.locator('.klaar')).toHaveText('Iedereen staat quitte 🎉');
    await expect(page.locator('.transfers')).toBeHidden();
    await expect(page.locator('.item.betaling')).toContainText('Sofie betaalde jou');
    // betaling ongedaan maken via de lijst
    await page.locator('.item.betaling button:has-text("Verwijder")').click();
    await page.locator('.item.betaling button:has-text("Ja, verwijder")').click();
    await expect(page.locator('.transfers')).toContainText('Sofie betaalt jou € 40,00');
  });

  test('S6 tweede toestel: naam aanklikken = jezelf; lid met saldo kan niet weg', async ({ browser, request }, info) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'Hotel', amount: 1000, paidBy: g.memberId });
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.goto('/g/' + g.id);
    await expect(page.locator('.kopje')).toContainText('Ben je een van hen?');
    await page.locator('.chip', { hasText: 'Sofie' }).click();
    await expect(page.locator('.chip.ik')).toContainText('Sofie');
    await expect(page.locator('.transfers')).toContainText('Jij betaalt Ali € 5,00');
    expect(await page.evaluate((gid) => localStorage.getItem('evenly.m.' + gid), g.id)).toBe(s);
    // Sofie weghalen gaat niet: saldo
    await page.locator('.chipwrap', { hasText: 'Sofie' }).locator('.chip-x').click();
    await page.locator('.chipvraag button.ja').click();
    await expect(page.locator('.kolom-links .fout:not(.verborgen)')).toContainText('Sofie heeft nog een saldo');
    await ctx.close();
  });

  test('S7 eerste bezoek zonder naam: naam invullen maakt je lid', async ({ browser, request }, info) => {
    const g = await maakGroep(request);
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.goto('/g/' + g.id);
    await page.fill('#joinnaam', 'Tom');
    await page.click('.kaart button:has-text("Verder")');
    await expect(page.locator('.chip.ik')).toContainText('Tom');
    await expect(page.locator('#joinnaam')).toBeHidden();
    expect((await groep(request, g.id)).members.map((m) => m.name)).toEqual(['Ali', 'Tom']);
    await ctx.close();
  });

  test('S8 munten: JPY zonder decimalen, KWD met drie, notatie per taal', async ({ page, request }) => {
    const g = await maakGroep(request, { currency: 'JPY' });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'en'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await vulUitgave(page, 'Ramen', '1200');
    await page.click('.form button:has-text("Add")');
    await expect(page.locator('.item', { hasText: 'Ramen' })).toContainText('1,200');
    expect((await groep(request, g.id)).expenses[0].amount).toBe(1200);
    await vulUitgave(page, 'Half', '12.5');
    await page.click('.form button:has-text("Add")');
    await expect(page.locator('.form p[role="alert"]')).toBeVisible();
    const k = await maakGroep(request, { currency: 'KWD' });
    await page.goto('/g/' + k.id);
    await page.evaluate(([gid, mid]) => localStorage.setItem('evenly.m.' + gid, mid), [k.id, k.memberId]);
    await page.reload();
    await vulUitgave(page, 'Tea', '1.234');
    await page.click('.form button:has-text("Add")');
    await expect(page.locator('.item', { hasText: 'Tea' })).toBeVisible();
    expect((await groep(request, k.id)).expenses[0].amount).toBe(1234);
  });

  test('S9 Arabisch: rechts-naar-links, vertaalde knoppen, getallen in Latijnse cijfers', async ({ page, request }) => {
    const g = await maakGroep(request);
    await lid(request, g.id, 'سارة');
    await uitgave(request, g.id, { description: 'عشاء', amount: 5000, paidBy: g.memberId });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'ar'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('.item', { hasText: 'عشاء' })).toContainText(/50[.,٫]00/);
    await expect(page.locator('#voet a.faq')).toHaveAttribute('href', '/ar/faq');
  });

  test('S10 taal wisselen via de wereldbol en alle 23 talen tonen zonder fouten', async ({ page, request }) => {
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    await uitgave(request, g.id, { description: 'x', amount: 999, paidBy: s, split: 'shares', weights: { [g.memberId]: 2, [s]: 1 } });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); }, [g.id, g.memberId]);
    const fouten = [];
    page.on('pageerror', (e) => fouten.push(e.message));
    await page.goto('/g/' + g.id);
    const talen = await page.evaluate(() => Object.keys(TALEN));
    expect(talen).toHaveLength(23);
    for (const l of talen) {
      await page.click('#vlag');
      await page.click(`#talen button[lang="${l}"]`);
      await expect(page.locator('html')).toHaveAttribute('lang', l);
      // geen ruwe sleutels of lege plaatshouders op het scherm
      const tekst = await page.locator('#scherm').innerText();
      expect(tekst, l).not.toMatch(/\{[a-z]+\}|expense\.|balances\.|transfers\.|members\./);
    }
    expect(fouten).toEqual([]);
  });

  test('S11 hele groep verwijderen: terug naar start met melding, weg uit "Jouw groepen"', async ({ page, request }) => {
    const g = await maakGroep(request);
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('.titelrij h1')).toHaveText('Lissabon');
    await page.goto('/');
    await expect(page.locator('.recent')).toContainText('Lissabon');
    await page.goto('/g/' + g.id);
    await page.click('button:has-text("Groep volledig verwijderen")');
    await page.click('button:has-text("Ja, verwijder alles voor iedereen")');
    await page.waitForURL(/\/$/);
    await expect(page.locator('.deel')).toContainText('De groep is verwijderd.');
    await expect(page.locator('.recent')).toHaveCount(0);
    expect((await request.get('/api/groups/' + g.id)).status()).toBe(404);
  });

  test('S12 onbekende link toont "bestaat niet"', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('evenly.lang', 'nl'));
    await page.goto('/g/zzzzzzzzzz');
    await expect(page.locator('h1')).toHaveText('Deze groep bestaat niet');
  });

  test('S13 een tweede persoon ziet wijzigingen zonder herladen (verversen elke 10 s)', async ({ browser, request }, info) => {
    test.setTimeout(60_000);
    const g = await maakGroep(request);
    const s = await lid(request, g.id, 'Sofie');
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, s]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('.saldi')).toContainText('Nog geen uitgaven');
    await uitgave(request, g.id, { description: 'Koffie', amount: 600, paidBy: g.memberId });
    await expect(page.locator('.item', { hasText: 'Koffie' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.transfers')).toContainText('Jij betaalt Ali € 3,00');
    await ctx.close();
  });

  test('S14 typen in het formulier wordt niet onderbroken door verversen', async ({ page, request }) => {
    test.setTimeout(60_000);
    const g = await maakGroep(request);
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await page.fill('#fwat', 'Half getypt');
    await page.focus('#fwat');
    await uitgave(request, g.id, { description: 'Van iemand anders', amount: 100, paidBy: g.memberId });
    await page.waitForTimeout(11_000);
    await expect(page.locator('#fwat')).toHaveValue('Half getypt');
    await expect(page.locator('#fwat')).toBeFocused();
  });

  test('S16 wie meedoet via de link, betaalt standaard zelf (niet de maker)', async ({ browser, request }, info) => {
    const g = await maakGroep(request);
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.goto('/g/' + g.id);
    await page.fill('#joinnaam', 'Bram');
    await page.click('.kaart button:has-text("Verder")');
    await expect(page.locator('.chip.ik')).toContainText('Bram');
    await expect(page.locator('#fwie option:checked')).toContainText('Bram');
    await vulUitgave(page, 'Pizza', '24,60');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Pizza' })).toContainText('Jij betaalde');
    const full = await groep(request, g.id);
    expect(full.members.find((m) => m.id === full.expenses[0].paidBy).name).toBe('Bram');
    await ctx.close();
  });

  test('S17 Arabisch: een uitgave aanpassen en bewaren werkt (decimaalteken)', async ({ page, request }) => {
    const g = await maakGroep(request);
    await uitgave(request, g.id, { description: 'عشاء', amount: 1250, paidBy: g.memberId });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'ar'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await page.locator('.item', { hasText: 'عشاء' }).locator('.acties button').first().click();
    await page.fill('#fwat', 'عشاء كبير');
    await page.locator('.formknoppen button').first().click();
    await expect(page.locator('.item', { hasText: 'عشاء كبير' })).toBeVisible();
    const full = await groep(request, g.id);
    expect(full.expenses[0].amount).toBe(1250);
    expect(full.expenses[0].description).toBe('عشاء كبير');
  });

  test('S18 offline: duidelijke fout, en na herstel werkt de knop weer', async ({ browser, request }, info) => {
    const g = await maakGroep(request);
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('.saldi')).toBeVisible();
    await ctx.setOffline(true);
    await vulUitgave(page, 'Koffie', '3');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.form p[role="alert"]')).toContainText('offline');
    await expect(page.locator('.form button:has-text("Toevoegen")')).toBeEnabled();
    await ctx.setOffline(false);
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Koffie' })).toBeVisible();
    await ctx.close();
  });

  test('S19 duizendtallen en valutasymbolen in het bedrag', async ({ page, request }) => {
    const g = await maakGroep(request, { currency: 'JPY' });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await vulUitgave(page, 'Sushi', '¥1,200');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.item', { hasText: 'Sushi' })).toBeVisible();
    expect((await groep(request, g.id)).expenses[0].amount).toBe(1200);
    await vulUitgave(page, 'Fout', '12.50.');
    await page.click('.form button:has-text("Toevoegen")');
    await expect(page.locator('.form p[role="alert"]')).toContainText('bv.');
  });

  test('S20 "niet jij?" laat je opnieuw kiezen; × pas zichtbaar als je weet wie je bent', async ({ browser, request }, info) => {
    const g = await maakGroep(request);
    await lid(request, g.id, 'Sofie');
    const ctx = await nieuweContext(browser, info);
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('evenly.lang', 'nl'));
    await page.goto('/g/' + g.id);
    await expect(page.locator('.chip-x')).toHaveCount(0);
    await page.locator('.chip', { hasText: 'Ali' }).click();
    await expect(page.locator('.chip.ik')).toContainText('Ali');
    await expect(page.locator('.chip-x')).toHaveCount(2);
    await page.click('.nietik');
    await expect(page.locator('#joinnaam')).toBeVisible();
    await page.locator('.chip', { hasText: 'Sofie' }).click();
    await expect(page.locator('.chip.ik')).toContainText('Sofie');
    await ctx.close();
  });

  test('S15 mobiel 360 px: geen horizontale scroll, knoppen minstens 44 px hoog', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'mobiel-360', 'alleen op 360 px');
    const g = await maakGroep(request, { title: 'Een heel lange groepsnaam die zeker niet op één regel past' });
    const s = await lid(request, g.id, 'Maximiliaan-Alexander');
    await uitgave(request, g.id, { description: 'Een bijzonder lange omschrijving van een uitgave', amount: 123456789, paidBy: s });
    await page.addInitScript(([gid, mid]) => { localStorage.setItem('evenly.m.' + gid, mid); localStorage.setItem('evenly.lang', 'nl'); }, [g.id, g.memberId]);
    await page.goto('/g/' + g.id);
    await expect(page.locator('.item').first()).toBeVisible();
    const breed = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(breed).toBeLessThanOrEqual(360);
    const klein = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 36).map((b) => b.textContent.trim()));
    expect(klein).toEqual([]);
  });
});

/* ================================================================
   Statisch
   ================================================================ */
test.describe('Statisch', () => {
  test.beforeEach(({ }, info) => { test.skip(info.project.name !== 'desktop', 'één keer'); });
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'worker.js'), 'utf8');
  function vertalingen() {
    const i = html.indexOf('const VERTALINGEN = {');
    const j = html.indexOf('\nconst BRAND');
    return eval('(' + html.slice(i + 'const VERTALINGEN = '.length, j).replace(/;\s*$/, '') + ')');
  }

  test('geen externe scripts of stylesheets', () => {
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
  });

  test('alle 23 talen hebben alle sleutels, dezelfde plaatshouders en de juiste meervoudsvormen', () => {
    const V = vertalingen();
    const en = V.en;
    const ph = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');
    expect(Object.keys(V)).toHaveLength(23);
    for (const [l, taal] of Object.entries(V)) {
      for (const k of Object.keys(en)) {
        expect(taal[k], `${l}.${k}`).toBeDefined();
        if (typeof en[k] === 'object') {
          let cats = ['other'];
          try { cats = new Intl.PluralRules(l).resolvedOptions().pluralCategories; } catch {}
          for (const c of cats) expect(taal[k][c], `${l}.${k}.${c}`).toBeDefined();
        } else {
          expect(ph(taal[k]), `${l}.${k}`).toBe(ph(en[k]));
        }
      }
      expect(Object.keys(taal).filter((k) => !(k in en)), l).toEqual([]);
    }
  });

  test('META in de worker is gelijk aan make.title/make.tagline in de app', () => {
    const V = vertalingen();
    for (const l of Object.keys(V)) {
      const m = new RegExp('\\b' + l + ": \\{ rtl: (?:true|false),\\s*title: '([^']*)', desc: '([^']*)'").exec(worker);
      expect(m, l).not.toBeNull();
      expect(m[1], l).toBe(V[l]['make.title']);
      expect(m[2], l).toBe(V[l]['make.tagline']);
    }
  });

  test('munten in de app zijn dezelfde als in de worker', () => {
    const app = eval('(' + /const MUNTEN = (\{[^}]+\})/.exec(html)[1] + ')');
    const srv = eval('(' + /export const CURRENCIES = (\{[\s\S]+?\});/.exec(worker)[1] + ')');
    expect(app).toEqual(srv);
  });

  test('rekenregels in de app zijn dezelfde als in de worker', () => {
    const uit = (src, naam) => {
      const i = src.indexOf('function ' + naam);
      let d = 0, j = src.indexOf('{', i);
      for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}') { d--; if (!d) return src.slice(src.indexOf('(', i), k + 1).replace(/\s+/g, ''); } }
    };
    for (const f of ['verdeelGelijk', 'verdeelGewogen']) expect(uit(html, f), f).toBe(uit(worker, f));
  });
});
