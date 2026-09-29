// Evenly — gedeelde kosten in een groep, zonder account. De volledige API in één Worker.
// Alle antwoorden zijn JSON met Cache-Control: no-store.
// Fouten: { "error": "<code>" } met HTTP 400/404/409; de frontend vertaalt de codes.
// Bedragen zijn altijd gehele getallen in de kleinste munteenheid (centen).

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const SITE = 'https://evenly.vanali.workers.dev';
const BRAND = 'Evenly';

// Titel en omschrijving per taal voor de taalpagina's (/nl/, /ar/ ...). Moeten
// gelijk zijn aan make.title en make.tagline in public/index.html (test bewaakt dit).
const META = {
  en: { rtl: false, title: 'Who owes what?', desc: 'Split costs with your group. No account, no ads, free.' },
  nl: { rtl: false, title: 'Wie moet wat?', desc: 'Kosten delen met je groep. Zonder account, zonder reclame, gratis.' },
  fr: { rtl: false, title: 'Qui doit quoi ?', desc: 'Partagez les dépenses de votre groupe. Sans compte, sans pub, gratuit.' },
  de: { rtl: false, title: 'Wer schuldet was?', desc: 'Kosten in der Gruppe teilen. Ohne Konto, ohne Werbung, kostenlos.' },
  es: { rtl: false, title: '¿Quién debe qué?', desc: 'Reparte los gastos con tu grupo. Sin cuenta, sin anuncios, gratis.' },
  pt: { rtl: false, title: 'Quem deve o quê?', desc: 'Divide as despesas com o teu grupo. Sem conta, sem anúncios, grátis.' },
  pl: { rtl: false, title: 'Kto ile jest winien?', desc: 'Dziel koszty w grupie. Bez konta, bez reklam, za darmo.' },
  uk: { rtl: false, title: 'Хто кому винен?', desc: 'Діліть витрати з групою. Без акаунта, без реклами, безкоштовно.' },
  ru: { rtl: false, title: 'Кто кому должен?', desc: 'Делите расходы с группой. Без аккаунта, без рекламы, бесплатно.' },
  tr: { rtl: false, title: 'Kim ne kadar borçlu?', desc: 'Masrafları grubunla paylaş. Hesap yok, reklam yok, ücretsiz.' },
  ar: { rtl: true,  title: 'من يدين بماذا؟', desc: 'اقتسموا المصاريف مع مجموعتكم. بدون حساب، بدون إعلانات، مجاناً.' },
  ur: { rtl: true,  title: 'کس نے کتنا دینا ہے؟', desc: 'اپنے گروپ کے ساتھ خرچے بانٹیں۔ نہ اکاؤنٹ، نہ اشتہار، مفت۔' },
  hi: { rtl: false, title: 'किसे कितना देना है?', desc: 'अपने ग्रुप के साथ खर्च बाँटें। न अकाउंट, न विज्ञापन, मुफ़्त।' },
  bn: { rtl: false, title: 'কে কত পাবে?', desc: 'আপনার দলের সাথে খরচ ভাগ করুন। কোনো অ্যাকাউন্ট নেই, বিজ্ঞাপন নেই, বিনামূল্যে।' },
  id: { rtl: false, title: 'Siapa berutang apa?', desc: 'Bagi pengeluaran dengan grupmu. Tanpa akun, tanpa iklan, gratis.' },
  vi: { rtl: false, title: 'Ai nợ ai?', desc: 'Chia chi phí với nhóm của bạn. Không tài khoản, không quảng cáo, miễn phí.' },
  zh: { rtl: false, title: '谁欠谁多少？', desc: '和朋友一起分摊费用。无需账号，没有广告，免费。' },
  ja: { rtl: false, title: '誰がいくら払う？', desc: 'グループで費用を割り勘。アカウント不要、広告なし、無料。' },
  ko: { rtl: false, title: '누가 얼마를 내야 할까?', desc: '그룹과 비용을 나누세요. 계정 없이, 광고 없이, 무료.' },
  sw: { rtl: false, title: 'Nani anadaiwa nini?', desc: 'Gawanya gharama na kikundi chako. Bila akaunti, bila matangazo, bure.' },
  zgh: { rtl: false, title: 'ⵎⴰ ⵉⵍⵍⴰⵏ ⴼⵍⵍⴰⵙ ⵎⴰ?', desc: 'ⴱⴹⵓ ⵜⵉⵎⵙⴰⵖⵉⵏ ⴷ ⵜⵔⴰⴱⴱⵓⵜ ⵏⵏⴽ. ⴱⵍⴰ ⴰⵎⵉⴹⴰⵏ, ⴱⵍⴰ ⵉⵙⴷⴰⵡⵏ, ⴱⴰⵟⵍ.' },
  ku: { rtl: false, title: 'Kî deyndarê çi ye?', desc: 'Mesrefan bi koma xwe re parve bike. Bê hesab, bê reklam, belaş.' },
  sn: { rtl: false, title: 'Ndiani ane chikwereti chei?', desc: 'Govana mari nechikwata chako. Hapana account, hapana zvishambadzo, mahara.' },
};
const OG_LOCALE = { en: 'en_GB', nl: 'nl_BE', fr: 'fr_BE', de: 'de_DE', es: 'es_ES', pt: 'pt_PT', pl: 'pl_PL', uk: 'uk_UA', ru: 'ru_RU', tr: 'tr_TR', ar: 'ar_EG', ur: 'ur_PK', hi: 'hi_IN', bn: 'bn_BD', id: 'id_ID', vi: 'vi_VN', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', sw: 'sw_KE', zgh: 'zgh_MA', ku: 'ku_TR', sn: 'sn_ZW' };

// Toegelaten munten en hun aantal decimalen (ISO 4217). Bedragen worden in de
// kleinste eenheid opgeslagen; de frontend toont ze met Intl.NumberFormat.
export const CURRENCIES = {
  EUR: 2, USD: 2, GBP: 2, CHF: 2, SEK: 2, NOK: 2, DKK: 2, PLN: 2, CZK: 2, HUF: 0, RON: 2, BGN: 2, UAH: 2, RUB: 2, TRY: 2,
  MAD: 2, DZD: 2, TND: 3, EGP: 2, NGN: 2, GHS: 2, KES: 2, TZS: 0, UGX: 0, ZAR: 2, XOF: 0, XAF: 0, ETB: 2, ZMW: 2, MZN: 2, AOA: 2,
  SAR: 2, AED: 2, QAR: 2, KWD: 3, BHD: 3, OMR: 3, JOD: 3, IQD: 0, ILS: 2, IRR: 0,
  INR: 2, PKR: 0, BDT: 2, LKR: 2, NPR: 2, IDR: 0, MYR: 2, SGD: 2, PHP: 2, VND: 0, THB: 2, CNY: 2, HKD: 2, TWD: 2, JPY: 0, KRW: 0,
  AUD: 2, NZD: 2, CAD: 2, MXN: 2, BRL: 2, ARS: 2, CLP: 0, COP: 0, PEN: 2,
};

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hreflangLinks() {
  const out = [`<link rel="alternate" hreflang="x-default" href="${SITE}/">`];
  for (const l of Object.keys(META)) out.push(`<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/">`);
  return out.join('\n');
}

// Startpagina in één taal: dezelfde app, met vertaalde <title>, omschrijving en OG-tags.
async function taalPagina(env, request, lang) {
  const asset = await env.ASSETS.fetch(new Request(new URL('/', request.url), { headers: request.headers }));
  if (!asset.ok) return asset;
  let html = await asset.text();
  const m = META[lang];
  const canon = `${SITE}/${lang}/`;
  const title = escHtml(m.title + ' · ' + BRAND);
  const desc = escHtml(m.desc);
  html = html
    .replace('<html lang="en">', `<html lang="${lang}"${m.rtl ? ' dir="rtl"' : ''}>`)
    .replace(`<title>${BRAND}</title>`, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canon}">\n<meta property="og:locale" content="${OG_LOCALE[lang]}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${desc}">`)
    .replace('</head>', `<link rel="canonical" href="${canon}">\n${hreflangLinks()}\n</head>`);
  return htmlResponse(html, asset);
}

async function startPagina(env, request) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  let html = await asset.text();
  html = html.replace('</head>', `<link rel="canonical" href="${SITE}/">\n${hreflangLinks()}\n</head>`);
  return htmlResponse(html, asset);
}

function htmlResponse(html, van) {
  const h = new Headers(van.headers);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.delete('Content-Length');
  h.delete('ETag');
  return new Response(html, { status: 200, headers: h });
}

// Groepspagina: de app zelf, maar niet indexeerbaar (titels, namen en bedragen zijn privé).
async function groepPagina(env, request) {
  const asset = await env.ASSETS.fetch(request);
  const h = new Headers(asset.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(asset.body, { status: asset.status, headers: h });
}

// Rate limiting per IP (Cloudflare Rate Limiting binding). Zonder binding of
// zonder CF-Connecting-IP (lokale dev) wordt niets beperkt.
async function teVeel(env, request, binding) {
  const rl = env[binding];
  const ip = request.headers.get('CF-Connecting-IP');
  if (!rl || !ip) return false;
  if (ip === '127.0.0.1' || ip === '::1') return false; // wrangler dev
  try {
    const { success } = await rl.limit({ key: ip });
    return !success;
  } catch (e) {
    console.error('ratelimit', binding, e);
    return false;
  }
}

// Wordt bij het deployen vervangen door het korte git-commitnummer.
const RAW_VERSION = '__VERSION__';
const APP_VERSION = RAW_VERSION.startsWith('__') ? 'dev' : RAW_VERSION;

const MAX_BODY = 32 * 1024;
const MAX_MEMBERS = 100;
const MAX_EXPENSES = 2000;     // incl. zacht verwijderde (die verdwijnen na 30 dagen)
const MAX_SETTLEMENTS = 2000;
const MAX_AMOUNT = 9_999_999_999; // in centen: 99.999.999,99
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ACTIVITEIT_DAGEN = 365;
const WEGGEHAALD_DAGEN = 30;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}
function fail(code, status = 400) {
  return json({ error: code }, status);
}

// 10 tekens uit [a-z0-9] met crypto.getRandomValues (≈ 52 bits), zonder modulo-bias.
function newId() {
  let out = '';
  while (out.length < 10) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) if (b < 252 && out.length < 10) out += ID_ALPHABET[b % 36];
  }
  return out;
}
function now() {
  return new Date().toISOString();
}
function normKey(name) {
  return name.normalize('NFKC').toUpperCase().toLowerCase().replace(/\s+/g, ' ');
}
// Tekst van een gebruiker: NFKC, zonder stuur- en opmaaktekens (zero-width, bidi-overrides,
// zachte afbreekstreepjes), vreemde spaties -> gewone spatie, en minstens één letter of cijfer.
function cleanText(raw, max) {
  if (typeof raw !== 'string') return null;
  const t = raw.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/[\p{Zs}\u2800]+/gu, ' ').trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return null;
  return t.length <= max ? t : null;
}
const cleanTitle = (r) => cleanText(r, 80);
const cleanName = (r) => cleanText(r, 40);
const cleanDescription = (r) => cleanText(r, 80);

function validDate(d) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const [y, m, day] = d.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return false;
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== day) return false;
  // niet verder dan één dag in de toekomst (tijdzones)
  const morgen = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return d <= morgen;
}
// Bedrag in centen: geheel, > 0, niet absurd groot.
function validAmount(a) {
  return Number.isInteger(a) && a > 0 && a <= MAX_AMOUNT;
}
function validCurrency(c) {
  return typeof c === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, c);
}

async function readBody(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return null;
  let text;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > MAX_BODY) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rekenwerk (puur; ook door de testen gecontroleerd via de API)
// ---------------------------------------------------------------------------

// Verdeelt `amount` over `members` (ids, in volgorde). Restcenten gaan eerst naar de
// betaler (die "draagt" de afronding), daarna naar de leden in volgorde.
export function verdeelGelijk(amount, members, paidBy) {
  const n = members.length;
  const basis = Math.floor(amount / n);
  let rest = amount - basis * n;
  const out = new Map(members.map((m) => [m, basis]));
  const volgorde = members.includes(paidBy) ? [paidBy, ...members.filter((m) => m !== paidBy)] : members.slice();
  for (const m of volgorde) {
    if (rest <= 0) break;
    out.set(m, out.get(m) + 1);
    rest--;
  }
  return out;
}

// Verdeelt naar gewichten (bv. 2:1:1): eerst naar beneden afgerond, de restcenten (minder dan
// het aantal leden) eerst naar de betaler en dan in volgorde, zoals hierboven.
export function verdeelGewogen(amount, weights, paidBy) {
  const members = Object.keys(weights);
  const totaal = members.reduce((s, m) => s + weights[m], 0);
  const out = new Map();
  let toegekend = 0;
  for (const m of members) {
    const deel = Math.floor((amount * weights[m]) / totaal);
    out.set(m, deel);
    toegekend += deel;
  }
  let rest = amount - toegekend;
  const volgorde = members.includes(paidBy) ? [paidBy, ...members.filter((m) => m !== paidBy)] : members.slice();
  for (const m of volgorde) {
    if (rest <= 0) break;
    out.set(m, out.get(m) + 1);
    rest--;
  }
  return out;
}

// Saldo per lid: betaald - eigen aandeel + betalingen gedaan - betalingen ontvangen.
// Positief = krijgt nog geld, negatief = moet nog betalen. De som is altijd 0.
export function berekenSaldi(memberIds, expenses, settlements) {
  const net = new Map(memberIds.map((m) => [m, 0]));
  const add = (m, v) => net.set(m, (net.get(m) || 0) + v);
  for (const e of expenses) {
    add(e.paidBy, e.amount);
    for (const s of e.shares) add(s.memberId, -s.share);
  }
  for (const s of settlements) {
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }
  return net;
}

// Wie betaalt wie: grootste schuldenaar aan grootste schuldeiser, tot alles rond is.
// Hoogstens n-1 overschrijvingen; deterministisch (bij gelijke bedragen: volgorde van de leden).
export function berekenOverschrijvingen(net, volgorde) {
  const rang = new Map(volgorde.map((m, i) => [m, i]));
  const cmp = (a, b) => b.v - a.v || rang.get(a.m) - rang.get(b.m);
  let schuld = [...net].filter(([, v]) => v < 0).map(([m, v]) => ({ m, v: -v })).sort(cmp);
  let tegoed = [...net].filter(([, v]) => v > 0).map(([m, v]) => ({ m, v })).sort(cmp);
  const out = [];
  // eerst wie precies evenveel moet als een ander tegoed heeft: dat is één betaling in plaats van twee
  for (const s of schuld) {
    const t = tegoed.find((x) => x.v > 0 && x.v === s.v);
    if (t) { out.push({ from: s.m, to: t.m, amount: s.v }); t.v = 0; s.v = 0; }
  }
  schuld = schuld.filter((x) => x.v > 0);
  tegoed = tegoed.filter((x) => x.v > 0);
  let i = 0, j = 0;
  while (i < schuld.length && j < tegoed.length) {
    const bedrag = Math.min(schuld[i].v, tegoed[j].v);
    out.push({ from: schuld[i].m, to: tegoed[j].m, amount: bedrag });
    schuld[i].v -= bedrag;
    tegoed[j].v -= bedrag;
    if (schuld[i].v === 0) i++;
    if (tegoed[j].v === 0) j++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getGroup(env, id) {
  return env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first();
}
function raak(env, groupId) {
  return env.DB.prepare('UPDATE groups SET last_activity_at = ? WHERE id = ?').bind(now(), groupId);
}

async function getFullGroup(env, id) {
  const group = await getGroup(env, id);
  if (!group) return null;
  const [memRes, expRes, shareRes, setRes] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, deleted_at FROM members WHERE group_id = ? ORDER BY created_at, id').bind(id),
    env.DB.prepare(
      'SELECT id, description, amount, paid_by, date, split, created_at, updated_at, deleted_at FROM expenses WHERE group_id = ? ORDER BY date DESC, created_at DESC'
    ).bind(id),
    env.DB.prepare(
      `SELECT s.expense_id, s.member_id, s.share, s.weight FROM expense_shares s
         JOIN expenses e ON e.id = s.expense_id WHERE e.group_id = ?`
    ).bind(id),
    env.DB.prepare(
      'SELECT id, from_member, to_member, amount, date, created_at, deleted_at FROM settlements WHERE group_id = ? ORDER BY date DESC, created_at DESC'
    ).bind(id),
  ]);
  const sharesByExpense = new Map();
  for (const s of shareRes.results) {
    if (!sharesByExpense.has(s.expense_id)) sharesByExpense.set(s.expense_id, []);
    sharesByExpense.get(s.expense_id).push({ memberId: s.member_id, share: s.share, weight: s.weight });
  }
  const expenses = expRes.results.filter((e) => !e.deleted_at).map((e) => ({
    id: e.id, description: e.description, amount: e.amount, paidBy: e.paid_by, date: e.date, split: e.split,
    createdAt: e.created_at, updatedAt: e.updated_at, shares: sharesByExpense.get(e.id) || [],
  }));
  const settlements = setRes.results.filter((s) => !s.deleted_at).map((s) => ({
    id: s.id, from: s.from_member, to: s.to_member, amount: s.amount, date: s.date, createdAt: s.created_at,
  }));
  const alleIds = memRes.results.map((m) => m.id);
  const net = berekenSaldi(alleIds, expenses, settlements);
  const actief = memRes.results.filter((m) => !m.deleted_at);
  const weggehaald = memRes.results.filter((m) => m.deleted_at);
  // saldi: alle actieve leden, plus weggehaalde leden die (door latere wijzigingen) toch een saldo hebben
  const saldoLeden = memRes.results.filter((m) => !m.deleted_at || net.get(m.id) !== 0);
  const netRelevant = new Map(saldoLeden.map((m) => [m.id, net.get(m.id) || 0]));
  return {
    id: group.id,
    title: group.title,
    currency: group.currency,
    decimals: CURRENCIES[group.currency] ?? 2,
    visits: group.visits ?? 0,
    members: actief.map((m) => ({ id: m.id, name: m.name })),
    removed: weggehaald.map((m) => ({ id: m.id, name: m.name, deletedAt: m.deleted_at })),
    expenses,
    settlements,
    balances: saldoLeden.map((m) => ({ memberId: m.id, net: net.get(m.id) || 0 })),
    transfers: berekenOverschrijvingen(netRelevant, alleIds),
    // info voor de groep: "iemand heeft ... verwijderd" (geen fout van de app)
    removedExpenses: expRes.results.filter((e) => e.deleted_at).sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1)).slice(0, 10)
      .map((e) => ({ description: e.description, amount: e.amount, deletedAt: e.deleted_at })),
    // vaste volgorde van alle leden (ook weggehaalde), zodat kleuren niet verschuiven
    order: memRes.results.map((m) => m.id),
  };
}

async function groupMember(env, groupId, mid) {
  if (typeof mid !== 'string') return null;
  return env.DB.prepare('SELECT id, deleted_at FROM members WHERE id = ? AND group_id = ?').bind(mid, groupId).first();
}
async function activeMember(env, groupId, mid) {
  if (typeof mid !== 'string') return null;
  return env.DB.prepare('SELECT id FROM members WHERE id = ? AND group_id = ? AND deleted_at IS NULL').bind(mid, groupId).first();
}

// POST /api/groups
async function createGroup(env, body) {
  const title = cleanTitle(body.title);
  if (!title) return fail('title_required');
  const name = cleanName(body.name);
  if (!name) return fail('name_required');
  if (!validCurrency(body.currency)) return fail('invalid_currency');
  const groupId = newId();
  const memberId = newId();
  const ts = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO groups (id, title, currency, created_at, last_activity_at) VALUES (?, ?, ?, ?, ?)')
      .bind(groupId, title, body.currency, ts, ts),
    env.DB.prepare('INSERT INTO members (id, group_id, name, name_key, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(memberId, groupId, name, normKey(name), ts),
  ]);
  return json({ id: groupId, memberId }, 201);
}

// POST /api/groups/:id/members — lid toevoegen of terugvinden op naam
async function joinGroup(env, groupId, body) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  const name = cleanName(body.name);
  if (!name) return fail('name_required');
  const key = normKey(name);
  const existing = await env.DB.prepare('SELECT id, name, deleted_at FROM members WHERE group_id = ? AND name_key = ?')
    .bind(groupId, key).first();
  const onderLimiet = '(SELECT COUNT(*) FROM members WHERE group_id = ? AND deleted_at IS NULL) < ' + MAX_MEMBERS;
  if (existing) {
    if (existing.deleted_at) {
      const [r] = await env.DB.batch([
        env.DB.prepare(`UPDATE members SET deleted_at = NULL, name = ? WHERE id = ? AND ${onderLimiet}`).bind(name, existing.id, groupId),
        raak(env, groupId),
      ]);
      if (!r.meta.changes) return fail('limit_reached');
      return json({ memberId: existing.id, name });
    }
    return json({ memberId: existing.id, name: existing.name });
  }
  const id = newId();
  try {
    const [r] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO members (id, group_id, name, name_key, created_at) SELECT ?, ?, ?, ?, ? WHERE ${onderLimiet}`)
        .bind(id, groupId, name, key, now(), groupId),
      raak(env, groupId),
    ]);
    if (!r.meta.changes) return fail('limit_reached');
  } catch {
    const winner = await env.DB.prepare('SELECT id, name FROM members WHERE group_id = ? AND name_key = ?').bind(groupId, key).first();
    if (winner) return json({ memberId: winner.id, name: winner.name });
    return fail('generic');
  }
  return json({ memberId: id, name }, 201);
}

// DELETE /api/groups/:id/members/:mid — alleen als het saldo 0 is
// Saldo van één lid, in SQL (zelfde regels als berekenSaldi), zodat het weghalen atomisch kan.
const SALDO_SQL = `(
  COALESCE((SELECT SUM(amount) FROM expenses WHERE paid_by = members.id AND deleted_at IS NULL), 0)
  - COALESCE((SELECT SUM(s.share) FROM expense_shares s JOIN expenses e ON e.id = s.expense_id WHERE s.member_id = members.id AND e.deleted_at IS NULL), 0)
  + COALESCE((SELECT SUM(amount) FROM settlements WHERE from_member = members.id AND deleted_at IS NULL), 0)
  - COALESCE((SELECT SUM(amount) FROM settlements WHERE to_member = members.id AND deleted_at IS NULL), 0)
)`;
async function deleteMember(env, groupId, mid) {
  const member = await activeMember(env, groupId, mid);
  if (!member) return fail('not_found', 404);
  const [r] = await env.DB.batch([
    env.DB.prepare(`UPDATE members SET deleted_at = ? WHERE id = ? AND group_id = ? AND deleted_at IS NULL AND ${SALDO_SQL} = 0`).bind(now(), mid, groupId),
    raak(env, groupId),
  ]);
  if (!r.meta.changes) return fail('has_balance', 409);
  return json({});
}

// Zet de body van een uitgave om naar { description, amount, paidBy, date, split, shares: Map }
// of geeft een foutcode terug.
// bestaand = id's die al op de uitgave stonden (betaler en deelnemers); die mogen blijven,
// ook als ze intussen weggehaald zijn, zodat een oude uitgave altijd aan te passen is.
async function parseExpense(env, groupId, body, bestaand = []) {
  const description = cleanDescription(body.description);
  if (!description) return { error: 'description_required' };
  if (!validAmount(body.amount)) return { error: 'invalid_amount' };
  if (!validDate(body.date)) return { error: 'invalid_date' };
  if (typeof body.paidBy !== 'string') return { error: 'invalid_split' };
  const leden = await env.DB.prepare('SELECT id, deleted_at FROM members WHERE group_id = ? ORDER BY created_at, id').bind(groupId).all();
  const actiefAlleen = leden.results.filter((m) => !m.deleted_at).map((m) => m.id);
  const actief = leden.results.filter((m) => !m.deleted_at || bestaand.includes(m.id)).map((m) => m.id);
  if (!actief.includes(body.paidBy)) return { error: 'member_not_found' };
  const split = body.split;
  let shares;
  if (split === 'equal') {
    if ('members' in body && !(Array.isArray(body.members) && body.members.every((m) => typeof m === 'string'))) return { error: 'invalid_split' };
    const gekozen = Array.isArray(body.members) ? [...new Set(body.members)] : actiefAlleen;
    if (!gekozen.length || gekozen.some((m) => !actief.includes(m))) return { error: 'invalid_split' };
    const geordend = actief.filter((m) => gekozen.includes(m));
    shares = verdeelGelijk(body.amount, geordend, body.paidBy);
  } else if (split === 'exact') {
    const opgegeven = body.shares && typeof body.shares === 'object' ? body.shares : null;
    if (!opgegeven) return { error: 'invalid_split' };
    const ids = Object.keys(opgegeven);
    if (!ids.length || ids.some((m) => !actief.includes(m))) return { error: 'invalid_split' };
    let som = 0;
    shares = new Map();
    for (const m of ids) {
      const v = opgegeven[m];
      if (!Number.isInteger(v) || v < 0 || v > MAX_AMOUNT) return { error: 'invalid_split' };
      if (v > 0) shares.set(m, v);
      som += v;
    }
    if (som !== body.amount) return { error: 'shares_mismatch' };
    if (!shares.size) return { error: 'invalid_split' };
  } else if (split === 'shares') {
    const opgegeven = body.weights && typeof body.weights === 'object' ? body.weights : null;
    if (!opgegeven) return { error: 'invalid_split' };
    const ids = Object.keys(opgegeven);
    if (!ids.length || ids.some((m) => !actief.includes(m))) return { error: 'invalid_split' };
    const weights = {};
    for (const m of actief) {
      if (!(m in opgegeven)) continue;
      const w = opgegeven[m];
      if (!Number.isInteger(w) || w < 0 || w > 1000) return { error: 'invalid_split' };
      if (w > 0) weights[m] = w;
    }
    if (!Object.keys(weights).length) return { error: 'invalid_split' };
    shares = verdeelGewogen(body.amount, weights, body.paidBy);
    for (const [m, v] of shares) shares.set(m, { share: v, weight: weights[m] });
  } else {
    return { error: 'invalid_split' };
  }
  const rijen = [...shares].map(([memberId, v]) => (typeof v === 'object' ? { memberId, ...v } : { memberId, share: v, weight: null }));
  return { description, amount: body.amount, paidBy: body.paidBy, date: body.date, split, shares: rijen };
}

function aandelenInvoegen(env, expenseId, shares) {
  const rijen = JSON.stringify(shares.map((s) => ({ m: s.memberId, s: s.share, w: s.weight })));
  return env.DB.prepare(`INSERT INTO expense_shares (expense_id, member_id, share, weight)
    SELECT ?, json_extract(value, '$.m'), json_extract(value, '$.s'), json_extract(value, '$.w') FROM json_each(?)`).bind(expenseId, rijen);
}

// POST /api/groups/:id/expenses
async function addExpense(env, groupId, body) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  const aantal = await env.DB.prepare('SELECT COUNT(*) AS c FROM expenses WHERE group_id = ?').bind(groupId).first();
  if (aantal && aantal.c >= MAX_EXPENSES) return fail('limit_reached');
  const e = await parseExpense(env, groupId, body);
  if (e.error) return fail(e.error, e.error === 'member_not_found' ? 404 : 400);
  const id = newId();
  const ts = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO expenses (id, group_id, description, amount, paid_by, date, split, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, groupId, e.description, e.amount, e.paidBy, e.date, e.split, ts),
    aandelenInvoegen(env, id, e.shares),
    // werd een betrokken lid net (gelijktijdig) weggehaald: dan is het weer actief, anders
    // zou een weggehaald lid een saldo krijgen
    env.DB.prepare(`UPDATE members SET deleted_at = NULL WHERE group_id = ? AND deleted_at IS NOT NULL
      AND id IN (SELECT member_id FROM expense_shares WHERE expense_id = ? UNION SELECT paid_by FROM expenses WHERE id = ?)`).bind(groupId, id, id),
    raak(env, groupId),
  ]);
  return json({ expenseId: id }, 201);
}

// PUT /api/groups/:id/expenses/:eid — volledig vervangen
async function updateExpense(env, groupId, eid, body) {
  const bestaand = await env.DB.prepare('SELECT id, paid_by FROM expenses WHERE id = ? AND group_id = ? AND deleted_at IS NULL').bind(eid, groupId).first();
  if (!bestaand) return fail('not_found', 404);
  const oud = await env.DB.prepare('SELECT member_id FROM expense_shares WHERE expense_id = ?').bind(eid).all();
  const betrokken = [bestaand.paid_by, ...oud.results.map((r) => r.member_id)];
  const e = await parseExpense(env, groupId, body, betrokken);
  if (e.error) return fail(e.error, e.error === 'member_not_found' ? 404 : 400);
  await env.DB.batch([
    env.DB.prepare('UPDATE expenses SET description = ?, amount = ?, paid_by = ?, date = ?, split = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
      .bind(e.description, e.amount, e.paidBy, e.date, e.split, now(), eid),
    env.DB.prepare('DELETE FROM expense_shares WHERE expense_id = ?').bind(eid),
    aandelenInvoegen(env, eid, e.shares),
    raak(env, groupId),
  ]);
  return json({});
}

// DELETE /api/groups/:id/expenses/:eid — zacht; 30 dagen als info zichtbaar
async function deleteExpense(env, groupId, eid) {
  const bestaand = await env.DB.prepare('SELECT id FROM expenses WHERE id = ? AND group_id = ? AND deleted_at IS NULL').bind(eid, groupId).first();
  if (!bestaand) return fail('not_found', 404);
  await env.DB.batch([
    env.DB.prepare('UPDATE expenses SET deleted_at = ? WHERE id = ?').bind(now(), eid),
    raak(env, groupId),
  ]);
  return json({});
}

// POST /api/groups/:id/settlements — "from heeft to betaald"
async function addSettlement(env, groupId, body) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  if (!validAmount(body.amount)) return fail('invalid_amount');
  if (!validDate(body.date)) return fail('invalid_date');
  if (typeof body.from !== 'string' || typeof body.to !== 'string' || body.from === body.to) return fail('invalid_split');
  // weggehaalde leden mogen: zo kan een saldo dat na hun vertrek ontstond toch vereffend worden
  const [a, b] = await Promise.all([groupMember(env, groupId, body.from), groupMember(env, groupId, body.to)]);
  if (!a || !b) return fail('member_not_found', 404);
  const aantal = await env.DB.prepare('SELECT COUNT(*) AS c FROM settlements WHERE group_id = ?').bind(groupId).first();
  if (aantal && aantal.c >= MAX_SETTLEMENTS) return fail('limit_reached');
  const id = newId();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO settlements (id, group_id, from_member, to_member, amount, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, groupId, body.from, body.to, body.amount, body.date, now()),
    raak(env, groupId),
  ]);
  return json({ settlementId: id }, 201);
}

async function deleteSettlement(env, groupId, sid) {
  const bestaand = await env.DB.prepare('SELECT id FROM settlements WHERE id = ? AND group_id = ? AND deleted_at IS NULL').bind(sid, groupId).first();
  if (!bestaand) return fail('not_found', 404);
  await env.DB.batch([
    env.DB.prepare('UPDATE settlements SET deleted_at = ? WHERE id = ?').bind(now(), sid),
    raak(env, groupId),
  ]);
  return json({});
}

// DELETE /api/groups/:id — alles meteen en volledig weg (CASCADE). Iedereen met de link mag dit.
async function deleteGroup(env, groupId) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  await env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
  return json({});
}

async function bumpVisit(env, groupId) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  await env.DB.prepare('UPDATE groups SET visits = visits + 1, last_activity_at = ? WHERE id = ?').bind(now(), groupId).run();
  return json({});
}

async function putTitle(env, groupId, body) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  const title = cleanTitle(body.title);
  if (!title) return fail('title_required');
  await env.DB.prepare('UPDATE groups SET title = ?, last_activity_at = ? WHERE id = ?').bind(title, now(), groupId).run();
  return json({});
}

// PUT /api/groups/:id/currency — alleen zolang er geen uitgaven of betalingen zijn
// (bedragen worden niet omgerekend).
async function putCurrency(env, groupId, body) {
  const group = await getGroup(env, groupId);
  if (!group) return fail('not_found', 404);
  if (!validCurrency(body.currency)) return fail('invalid_currency');
  const r = await env.DB.prepare(`UPDATE groups SET currency = ?, last_activity_at = ? WHERE id = ?
    AND NOT EXISTS (SELECT 1 FROM expenses WHERE group_id = groups.id)
    AND NOT EXISTS (SELECT 1 FROM settlements WHERE group_id = groups.id)`).bind(body.currency, now(), groupId).run();
  if (!r.meta.changes) return fail('currency_locked', 409);
  return json({});
}

// Dagelijkse opruiming (Cron Trigger): groepen zonder activiteit sinds ACTIVITEIT_DAGEN
// verdwijnen volledig; zacht verwijderde leden, uitgaven en betalingen na WEGGEHAALD_DAGEN definitief.
async function opruimen(env) {
  const grensGroep = new Date(Date.now() - ACTIVITEIT_DAGEN * 86400000).toISOString();
  const grensWeg = new Date(Date.now() - WEGGEHAALD_DAGEN * 86400000).toISOString();
  const [a, b, c, d] = await env.DB.batch([
    env.DB.prepare('DELETE FROM groups WHERE COALESCE(last_activity_at, created_at) < ?').bind(grensGroep),
    env.DB.prepare('DELETE FROM expenses WHERE deleted_at IS NOT NULL AND deleted_at < ?').bind(grensWeg),
    env.DB.prepare('DELETE FROM settlements WHERE deleted_at IS NOT NULL AND deleted_at < ?').bind(grensWeg),
    // weggehaalde leden alleen als er niets meer naar verwijst (oude uitgaven blijven leesbaar)
    env.DB.prepare(`DELETE FROM members WHERE deleted_at IS NOT NULL AND deleted_at < ?
      AND id NOT IN (SELECT paid_by FROM expenses) AND id NOT IN (SELECT member_id FROM expense_shares)
      AND id NOT IN (SELECT from_member FROM settlements) AND id NOT IN (SELECT to_member FROM settlements)`).bind(grensWeg),
  ]);
  const uit = { groups: a.meta.changes, expenses: b.meta.changes, settlements: c.meta.changes, members: d.meta.changes };
  console.log('opruimen', JSON.stringify(uit));
  return uit;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(opruimen(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname.split('/').filter(Boolean);
    const method = request.method;

    if (p[0] !== 'api' && (method === 'GET' || method === 'HEAD')) {
      if (p.length === 0) return startPagina(env, request);
      if (p.length === 1 && META[p[0]]) return taalPagina(env, request, p[0]);
      if (p[0] === 'g') return groepPagina(env, request);
      return env.ASSETS.fetch(request);
    }

    if (p[0] === 'api' && p[1] === 'version' && p.length === 2 && method === 'GET') {
      return json({ version: APP_VERSION });
    }
    if (p[0] === 'api' && p[1] === 'health' && p.length === 2 && method === 'GET') {
      try {
        await env.DB.prepare('SELECT 1').first();
        return json({ ok: true, version: APP_VERSION });
      } catch (e) {
        console.error('health', e);
        return json({ ok: false }, 503);
      }
    }
    if (p[0] === 'api' && p[1] === 'currencies' && p.length === 2 && method === 'GET') {
      return json(CURRENCIES);
    }

    if (p[0] !== 'api' || p[1] !== 'groups') return fail('not_found', 404);

    try {
      if (method !== 'GET') {
        const binding = (p.length === 2 && method === 'POST') ? 'RL_CREATE' : 'RL_WRITE';
        if (await teVeel(env, request, binding)) return fail('too_many_requests', 429);
      }

      if (p.length === 2 && method === 'POST') {
        const body = await readBody(request);
        if (!body) return fail('generic');
        return await createGroup(env, body);
      }

      const groupId = p[2];
      if (!groupId || !/^[a-z0-9]{10}$/.test(groupId)) return fail('not_found', 404);

      if (p.length === 3 && method === 'GET') {
        const full = await getFullGroup(env, groupId);
        return full ? json(full) : fail('not_found', 404);
      }
      if (p.length === 3 && method === 'DELETE') return await deleteGroup(env, groupId);

      const sub = p[3];
      const heeftBody = (method === 'POST' || method === 'PUT') && sub !== 'visit';
      const body = heeftBody ? await readBody(request) : {};
      if (body === null) return fail('generic');

      if (sub === 'members' && p.length === 4 && method === 'POST') return await joinGroup(env, groupId, body);
      if (sub === 'members' && p.length === 5 && method === 'DELETE') return await deleteMember(env, groupId, p[4]);
      if (sub === 'expenses' && p.length === 4 && method === 'POST') return await addExpense(env, groupId, body);
      if (sub === 'expenses' && p.length === 5 && method === 'PUT') return await updateExpense(env, groupId, p[4], body);
      if (sub === 'expenses' && p.length === 5 && method === 'DELETE') return await deleteExpense(env, groupId, p[4]);
      if (sub === 'settlements' && p.length === 4 && method === 'POST') return await addSettlement(env, groupId, body);
      if (sub === 'settlements' && p.length === 5 && method === 'DELETE') return await deleteSettlement(env, groupId, p[4]);
      if (sub === 'visit' && p.length === 4 && method === 'POST') return await bumpVisit(env, groupId);
      if (sub === 'title' && p.length === 4 && method === 'PUT') return await putTitle(env, groupId, body);
      if (sub === 'currency' && p.length === 4 && method === 'PUT') return await putCurrency(env, groupId, body);

      return fail('not_found', 404);
    } catch (e) {
      console.error(method, url.pathname, e && e.message ? e.message : e);
      return fail('generic', 500);
    }
  },
};
