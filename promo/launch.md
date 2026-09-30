# Evenly: globale launch (stap voor stap)

Doel: de eerste echte gebruikers en wat cijfers, via de kanalen waar een maker normaal zijn eigen werk toont. Evenly is het tweede project na Whenly; alles hieronder volgt dezelfde aanpak, maar op andere dagen dan Whenly, zodat de twee launches elkaar niet in de weg zitten.

## Status

| Onderdeel | Status |
|---|---|
| Site live op https://evenly.vanali.workers.dev | GEDAAN |
| 23 talen, FAQ en privacypagina in dezelfde 23 | GEDAAN |
| IndexNow: 70 URL's aangemeld bij Bing, Yandex, Naver, Seznam | GEDAAN (`node tools/indexnow.mjs`, opnieuw na elke deploy met nieuwe pagina's) |
| GitHub: description, website en topics | GEDAAN |
| README met live link, screenshot en doneerregel | GEDAAN |
| Screenshots, demo-GIF, Product Hunt-galerij (`promo/assets/`) | GEDAAN (`node tools/promo_shots.mjs`) |
| Google Search Console: verificatiebestand | JIJ: maak de property aan, geef mij het HTML-bestand, ik zet het in `public/` |
| Bing Webmaster Tools | JIJ (kan ook via "importeren uit Search Console") |
| Product Hunt inplannen, op een andere dag dan Whenly | JIJ: voorstel hieronder, 14 oktober 2026 |
| Directories (AlternativeTo, OpenAlternative, SaaSHub, Fazier) | JIJ: vragen allemaal jouw login; teksten staan klaar |
| Show HN | JIJ, pas met een HN-account dat wat geschiedenis heeft (zie stap 2) |

Afspraken die overal gelden:

- Afzender: **Evenly** of **"the maker of Evenly"**. Geen persoonsnaam, geen locatie, geen foto.
- Contact: alleen **https://github.com/boulbaal/evenly/issues**. Nergens een e-mailadres.
- Nooit om upvotes vragen, ook niet aan vrienden. Hacker News en Product Hunt straffen dat af (posts verdwijnen, stemmen tellen niet).
- Antwoord snel en eerlijk op elke reactie, vooral kritiek. Dat is op HN en PH wat een post laat stijgen, niet de stemmen.
- Eén kanaal per dag. Niet alles op dezelfde dag, dan kun je de reacties niet bijhouden.
- Ik plaats niets; jij plakt. Ik maak geen accounts aan.

Status van de tekst hieronder: klaar om te plakken. Pas aan wat je anders wilt zeggen, het is jouw stem.

---

## Tijdlijn (botst niet met Whenly)

Whenly stond op 30 september 2026 (woensdag) op Product Hunt. PH-bezoekers en je eigen aandacht hebben een pauze nodig; daarom Evenly op PH niet vroeger dan twee weken later, op een dinsdag, woensdag of donderdag.

| Dag | Kanaal |
|---|---|
| do 1 okt t/m vr 2 okt | Stap 0: Search Console, repo nakijken. Whenly-reacties op PH afhandelen gaat voor. |
| ma 5 okt | Stap 1: directories (AlternativeTo, OpenAlternative, SaaSHub, Fazier), één blok van een uur |
| di 6 okt of wo 7 okt | Stap 3: r/SideProject |
| do 8 okt | Stap 3: r/InternetIsBeautiful (na de regels te lezen) |
| za 10 okt | Stap 3: r/webdev, alleen op Showoff Saturday |
| **wo 14 okt** | **Stap 4: Product Hunt** (reserve: do 15 okt of di 20 okt) |
| later | Stap 2: Show HN, zodra je HN-account geschiedenis heeft; niet op dezelfde dag als PH |

Waarom 14 oktober: precies twee weken na Whenly, een woensdag, en ruim na de Reddit-posts zodat je weet welke vragen er komen.

---

## Stap 0: voor je ergens post

1. **GitHub-repo netjes.** [GEDAAN] README Engels bovenaan met live link, screenshot (`promo/assets/shot-group-en.png`) en doneerregel; Nederlands eronder; description, website en topics gezet.
2. **Product Hunt-account**: je hebt er al een van de Whenly-launch. Gebruik hetzelfde; een account met een eerdere launch weegt zwaarder dan een nieuw.
3. **Hacker News-account**: je huidige account mag geen Show HN plaatsen (beperkt). Show HN heeft een account met wat geschiedenis nodig. Maak een account dat een paar weken gewoon meeleest en af en toe een nuttige reactie schrijft (geen links naar je eigen werk). Pas daarna stap 2.
4. **Google Search Console en Bing Webmaster Tools** (jij, eigen Google/Microsoft-account). Verifiëren met een HTML-bestand: geef mij het bestand, ik zet het op de site. Daarna de sitemap indienen: `https://evenly.vanali.workers.dev/sitemap.xml`. Zonder dit weet Google niet dat de 23 taalpagina's bestaan.
   [GEDAAN zonder account] IndexNow: alle 70 URL's aangemeld bij Bing, Yandex, Naver en Seznam. Google doet daar niet aan mee.
5. **Geen awesome-selfhosted.** Zelfde reden als bij Whenly: Evenly hangt af van Cloudflare Workers + D1, en het project is te jong.
6. **Niet doen:** Lobsters (alleen op uitnodiging), BetaList (voor bèta's, betaalde wachtrij), massaal aanmelden bij "launch directories" die om een backlink of geld vragen.

---

## De eerlijke invalshoek: Splitwise

Veel mensen zoeken een alternatief omdat Splitwise het gratis plan heeft ingeperkt (sinds 2023/2024: onder meer een maximum aantal uitgaven per dag en advertenties). Gebruik dat, maar voorzichtig:

- Schrijf in het Engels **"Splitwise added limits to its free plan"**. Noem geen exact getal: de limiet is een paar keer veranderd en een fout cijfer kost je geloofwaardigheid.
- Nooit afkraken. Splitwise is een goed product met een betaald plan; Evenly is gewoon een andere keuze: geen account, geen limiet, geen advertenties, en je kunt de code lezen.
- Tricount en Settle Up: noem ze alleen als "alternative to" in directories. Zeg niets over hun prijzen of beperkingen; dat hebben we niet nagekeken.

---

## Stap 1: directories (één blok van een uur, laag risico)

Deze vragen een account (jij) en een korte tekst. Eén keer invullen, daarna niets meer aan doen.

**Korte omschrijving (≤ 160 tekens):**

> Split costs with your group. No account, no ads, free. One link, add expenses, see who pays whom. 23 languages, open source.

**Lange omschrijving:**

> Evenly is a free group expense splitter. Create a group, share the link, add what everyone paid. Evenly keeps the balances and shows the fewest payments needed to settle up; tap "Mark as paid" and it updates for everyone. Split equally, between some people, by exact amounts or by shares (2:1:1). 60+ currencies with the right number of decimals. No account for anyone, no e-mail, no ads, no tracking, no daily limits. 23 languages including Arabic and Urdu (right-to-left), Hindi, Chinese, Swahili, Tamazight, Kurdish and Shona. Anyone with the link can delete the group; untouched groups are deleted after 12 months. Open source (MIT), a single HTML file on Cloudflare Workers + D1.

**Categorie / tags:** expense splitting, bill splitting, travel, group expenses, personal finance, open source, no signup.

**"Alternative to":** Splitwise, Tricount, Settle Up.

**Links:** website `https://evenly.vanali.workers.dev`, broncode `https://github.com/boulbaal/evenly`, support/contact `https://github.com/boulbaal/evenly/issues`.

Waar:

1. **AlternativeTo** (alternativeto.net → Add an app). Zet Evenly als alternatief voor **Splitwise**, **Tricount** en **Settle Up**. Licentie: Open Source (MIT). Platform: Web (Online), en aanvinken dat het gratis is. Wordt door een redacteur nagekeken; dat duurt dagen tot weken.
2. **OpenAlternative** (openalternative.co → Submit). Voor open-source alternatieven van bekende producten; vraagt de GitHub-URL. Kies Splitwise als het alternatief.
3. **SaaSHub** (saashub.com → Add a product). Voeg daarna bij "Alternatives" Splitwise, Tricount en Settle Up toe.
4. **Fazier** (fazier.com → Submit). Gratis launch kiezen, niet de betaalde plek. Kies een datum die niet op de PH-dag valt.
5. **Uneed** (uneed.best → Submit): gratis wachtrij van weken; de betaalde overslaan.

Beelden: `promo/assets/shot-group-en.png` (1280×800 @2x), `shot-group-en-mobile.png` (390×844 @2x), `shot-add-expense-en.png`. Logo: `public/icon-512.png`.

---

## Stap 2: Show HN (pas met een HN-account dat geschiedenis heeft; dinsdag t/m donderdag, posten tussen 14:00 en 16:00 Belgische tijd; niet op de PH-dag)

Je huidige HN-account is beperkt voor Show HN. Post dit dus niet vanaf dat account; wacht tot een account een tijd gewoon heeft meegedaan. Regels van HN voor Show HN: iets dat mensen meteen kunnen proberen (klopt), geen aanmelding nodig (klopt), jij hebt het zelf gemaakt en blijft erbij om vragen te beantwoorden (hou de dag vrij).

**URL-veld:** `https://evenly.vanali.workers.dev`

**Titel (max. 80 tekens):**

> Show HN: Evenly - split group expenses, no accounts, no ads, in 23 languages

**Tekstveld** (kort, feitelijk, geen marketingtoon):

> I built this after a trip where half the group wouldn't install an app or make an account just to split the costs, and the free tier of the usual app had started limiting how many expenses we could add. Evenly is one link: create a group, share it, add expenses. It keeps the balances and shows who pays whom.
>
> Some choices you may find interesting:
>
> - No accounts at all, not even for the creator. Identity is your name plus a member id in localStorage; anyone with the link can add, edit and delete. Deleted expenses stay visible as a note for 30 days, so the group sees that a person removed something, not the app.
> - Money is stored as integers in the smallest unit, per currency (JPY has 0 decimals, KWD has 3; 66 currencies). Equal splits round down and the leftover cents go to the payer first, so every expense adds up exactly. Four split modes: everyone, some people, exact amounts, shares.
> - Settling up: equal debts and credits are matched first, then largest debt to largest credit. That gives at most n-1 payments; it isn't a guaranteed global minimum (that problem is NP-hard), but for real groups it's what people expect.
> - 23 languages, including RTL (Arabic, Urdu) and a few browsers have no Intl data for (Tamazight in Tifinagh, Kurmanji Kurdish, Shona). The amount field reads 12,50 / 12.50 / 1.234,56 / 1,234.56 and Arabic-Indic digits.
> - One HTML file, no framework, no build step, no external scripts. Backend is one Cloudflare Worker with D1 (SQLite); the same split functions run in the worker and in the page, and a test checks they stay identical. Fits in the free plan.
> - Data: group name, member names, expenses and payments. Nothing else. Untouched groups are deleted after 12 months.
>
> Source (MIT): https://github.com/boulbaal/evenly
>
> Happy to hear what breaks, especially in languages I can't read myself.

**Wat je kunt verwachten aan vragen, en eerlijke antwoorden:**

- *"Anyone with the link can delete everything? That's a vandalism problem."* → Yes, by design. It's for groups who already trust each other; the link is a random 10-character code and group pages are marked noindex. Deleted expenses leave a visible note for 30 days. If a group can't trust its members with a link, it needs a tool with accounts.
- *"Fewest payments is NP-hard, your claim is wrong."* → Agreed, it's a greedy heuristic: at most n-1 transfers, exact matches first. Say that, don't argue.
- *"Why Cloudflare only? Not self-hostable."* → It runs on Workers + D1 because that's free and zero-ops. It's MIT; the worker is one file with plain SQL, porting it to another SQLite host is straightforward. Fair criticism though.
- *"How do you make money?"* → I don't. There's a donate button. It costs nothing to run on the free plan.
- *"How is this different from Splitwise / Tricount / Settle Up?"* → No account for anyone, no daily limit, no ads, open source, runs in any browser. Those apps do more; Evenly deliberately does less. Don't make claims about their pricing beyond "Splitwise added limits to its free plan".
- *"Multiple currencies in one group?"* → No, one currency per group. Conversion rates would need an external service and a choice of rate; kept out on purpose.
- *"The translations are machine-made?"* → They were written with an LLM and checked where I can read the language; some (Tamazight, Kurdish, Shona) I can't check. Corrections welcome as issues.

---

## Stap 3: Reddit (één sub per dag)

Lees vóór elke post de regels in de zijbalk van die sub; ze veranderen, en een verwijderde post is erger dan geen post. Gebruik een account dat al wat geschiedenis heeft; gloednieuwe accounts met alleen een link worden automatisch verwijderd.

**r/SideProject** (zelfpromotie is de bedoeling daar)

Titel:
> I made a free group expense splitter that needs no accounts from anyone, in 23 languages

Tekst:
> Evenly: create a group, share the link, add what everyone paid. It keeps the balances and shows who pays whom in as few payments as possible; tap "Mark as paid" and it updates for everyone. Split equally, between some people, exact amounts or shares. No sign-up for anyone, no ads, no tracking, no daily limits. 66 currencies, 23 languages incl. Arabic, Hindi, Chinese, Swahili. One HTML file on Cloudflare Workers, open source (MIT).
>
> https://evenly.vanali.workers.dev
>
> Built it because on our last trip half the group didn't want to install an app or make an account. Would love to know where it breaks for you.

**r/InternetIsBeautiful** (vereist: gratis en zonder aanmelding, dat klopt; controleer vooraf of tools van de maker zelf nog toegelaten zijn en welke flair nodig is)

Titel:
> Evenly: split trip and group costs without anyone creating an account, free and in 23 languages

Geen tekst nodig; de link is de post.

**r/opensource**

Titel:
> Evenly: an MIT-licensed group expense splitter with no accounts, one HTML file on Cloudflare Workers

Tekst: de Show HN-tekst, ingekort tot de eerste alinea plus de punten over geld als gehele getallen en "one HTML file", met de GitHub-link bovenaan.

**r/webdev**: alleen op **Showoff Saturday** (zaterdag), anders wordt het verwijderd. Tekst van r/SideProject, met één technische alinea erbij (single file, no framework, same split functions in worker and page with a test that keeps them identical).

**Niet doen of eerst goed nakijken:**

- **r/travel**: niet geschikt. Zelfpromotie is daar niet toegelaten; een post wordt verwijderd en kan je account laten markeren.
- **r/solotravel** en **r/backpacking**: lees eerst de regels. Voor zover bekend is zelfpromotie daar niet toegelaten. Wat wel kan: als iemand in een bestaande thread vraagt hoe je kosten deelt, antwoorden en er eerlijk bij zeggen dat jij de maker bent. Nooit zelf een post openen.
- **r/splitwise**: bestaat niet; niet naar zoeken.
- **r/selfhosted**: overslaan. Evenly is niet zelf te hosten buiten Cloudflare; daar krijg je terecht kritiek.

---

## Stap 4: Product Hunt (woensdag 14 oktober 2026; de dag begint om 09:01 Belgische tijd, 12:01 am Pacific)

Niet op dezelfde dag als Whenly (30 september) en niet op een maandag of in het weekend. Plan de launch een paar dagen vooraf in; reservedagen: donderdag 15 of dinsdag 20 oktober.

**Naam:** Evenly

**Tagline (max. 60 tekens):**
> Split costs with your group. No account, no ads, free.

**Omschrijving (max. 500 tekens):**
> Split costs with your group without anyone making an account. Create a group, share the link, add expenses. Evenly keeps the balances and shows the fewest payments to settle up. Split equally, between some people, by exact amounts or by shares. 60+ currencies, 23 languages including right-to-left. No ads, no tracking, no daily limits. Anyone with the link can delete the group. Free and open source (MIT).

**Topics:** Fintech (of Personal Finance), Travel, Open Source, Productivity.

**Galerij** (1270×760, @2x, klaar in `promo/assets/`), in deze volgorde; geen logo als eerste beeld:
1. `ph-gallery-1-group.png`: saldi en "Who pays whom" groot, met de kop "Who owes whom, in the fewest payments."
2. `ph-gallery-2-mobile.png`: telefoon met de groep en de tagline.
3. `ph-gallery-3-home.png`: startpagina, "Start a group in ten seconds."
4. `demo-en.gif`: uitgave toevoegen → saldi veranderen → betaling afvinken (12 s).

**Thumbnail:** `public/icon-512.png`.

**Eerste reactie (jij, meteen na de launch; dit is wat mensen lezen):**

> Hi everyone. I'm the maker of Evenly.
>
> The problem: after a trip, someone has to work out who owes whom, and the usual app wants everyone to install it, make an account, and on the free plan it now has limits. Evenly asks nothing of anyone: one link, add what you paid, and it shows who pays whom in as few payments as possible.
>
> A few things I cared about:
> - No accounts, no e-mail, no ads, no tracking, no daily limits. Only the group name, names, expenses and payments are stored, and anyone with the link can delete the whole group.
> - Four ways to split: equally, between some people, exact amounts, or shares (2:1:1). Cents always add up exactly.
> - 60+ currencies and 23 languages, right-to-left included, picked from your browser.
> - Light: one HTML file, works in any browser, installs as a PWA if you want it on your home screen.
> - Free, and it stays free. Open source under MIT.
>
> This is my second small tool after Whenly (pick a date with a group). I'd love to hear where Evenly breaks, and which language reads badly. I'll be here all day.

**Makers:** alleen jouw PH-profiel. Geen "hunter" zoeken.

**Niet doen:** vrienden vragen om te stemmen, links naar de PH-pagina in groepen zetten met "please upvote". Wel mag: "Evenly staat vandaag op Product Hunt, kijk gerust" zonder om een stem te vragen.

---

## Stap 5: meten (vanaf dag 1)

- Bezoekers: Cloudflare-dashboard → Workers & Pages → evenly → Metrics (requests per dag). Geen analytics op de site zelf, dat is de afspraak op de privacypagina; het dashboard telt verzoeken, geen personen.
- Groepen: `npx wrangler d1 execute evenly --remote --command "SELECT count(*) FROM groups"` vanuit de projectmap.
- GitHub: sterren en issues.

Na twee weken: cijfers naast die van Whenly leggen. Verwachting vooraf, zodat we die kunnen toetsen: Evenly heeft een duidelijkere zoekvraag ("Splitwise alternative") dan Whenly, dus directories en AlternativeTo leveren op termijn meer op; Reddit en PH blijven een gok die afhangt van de eerste uren.

---

## Wat ik zelf nog kan doen zonder account

- Verificatiebestand voor Search Console / Bing op de site zetten zodra jij het geeft.
- Beelden opnieuw maken na een wijziging aan de app: `npm run db:local`, `npm run dev`, en in een tweede terminal `node tools/promo_shots.mjs`.
- Antwoorden helpen schrijven op reacties, als je ze me doorgeeft.

Gedaan: IndexNow, screenshots (desktop en mobiel), demo-GIF, PH-galerij, README, repo-metadata.
