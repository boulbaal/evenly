# Evenly

**Split costs with your group. No account, no ads, free.** → **[evenly.vanali.workers.dev](https://evenly.vanali.workers.dev)**

Create a group, share the link, add expenses. Evenly keeps the balances and shows the fewest payments needed to settle up. Nobody needs an account, not even the person who creates the group.

- **No sign-up, no e-mail, no password.** A link is all a group needs.
- **Four ways to split:** equally between everyone, equally between some, exact amounts, or shares (2:1:1). Cents that cannot be split evenly go to the person who paid, so every total adds up exactly.
- **Who pays whom:** the fewest transfers to get everyone to zero. Tap "Mark as paid" and the balances update for everyone.
- **66 currencies**, one per group, formatted the way your language writes money. Amount input understands `12,50`, `12.50`, `1.234,56`, `1,234.56`, `€12`, Arabic-Indic digits and more.
- **23 languages**, picked from your browser: English, Dutch, French, German, Spanish, Portuguese, Polish, Ukrainian, Russian, Turkish, Arabic, Urdu, Hindi, Bengali, Indonesian, Vietnamese, Chinese, Japanese, Korean, Swahili, Tamazight (Tifinagh), Kurdish and Shona. Right-to-left for Arabic and Urdu. FAQ and privacy page in the same 23.
- **Your data stays yours.** Only the group name, member names, expenses and payments are stored. Anyone with the link can delete the group completely; untouched groups are removed after 12 months. See [/privacy](https://evenly.vanali.workers.dev/privacy).
- **Light.** One HTML file, no framework, no build step, no external scripts. Installs as a PWA.
- **Open source (MIT)** on Cloudflare Workers + D1; fits in Cloudflare's free plan.

Sister project: [Whenly](https://github.com/boulbaal/whenly), pick a date with a group. Questions or bugs: [open an issue](https://github.com/boulbaal/evenly/issues).

---

*Nederlands*

**Kosten delen met je groep, zonder account.** Maak een groep, deel de link, voeg uitgaven toe. Evenly houdt de saldi bij en toont zo weinig mogelijk betalingen om alles te vereffenen. Iedereen met de link kan alles; wie iets weghaalt, laat 30 dagen een korte melding achter voor de groep.

## Techniek

| Onderdeel | Keuze |
|---|---|
| Hosting | Cloudflare Workers (gratis plan) met Static Assets |
| Opslag | Cloudflare D1 (SQLite); bedragen als gehele getallen in de kleinste munteenheid |
| Frontend | Eén `public/index.html`, inline CSS + JS, systeemfonts (enkel Tifinagh meegeleverd) |
| Backend | Eén `src/worker.js`: `/api/*`, taalpagina's, dagelijkse opruiming |
| Testen | Playwright: API tot op de cent, browserscenario's op desktop en 360 px, statische controles |

Rekenregels: gelijk verdelen rondt af naar beneden; de restcenten (minder dan het aantal leden) gaan eerst naar wie betaalde, dan in volgorde. Saldo = betaald − eigen aandelen + betalingen gedaan − betalingen ontvangen; de som is altijd 0. Wie-betaalt-wie koppelt eerst gelijke bedragen, daarna grootste schuld aan grootste tegoed (hoogstens n−1 betalingen). Dezelfde functies staan in de worker en in de app; een test bewaakt dat ze gelijk blijven.

## Testen draaien

```
npm install
npm run db:local
npm test
```

## Online zetten

```
npm install
npx wrangler login
npx wrangler d1 create evenly        # database_id in wrangler.toml zetten
npm run db:remote
git commit -am "..." && npm run deploy
node tools/indexnow.mjs              # na een deploy: pagina's aanmelden bij Bing, Yandex, Naver, Seznam
```

`npm run pages` maakt de FAQ-, privacy- en sitemappagina's opnieuw (teksten in `tools/paginas_teksten.py` en `tools/paginas_andere.py`).

## Licentie

MIT
