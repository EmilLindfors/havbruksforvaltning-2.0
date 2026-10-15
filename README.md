# Havbruksforvaltning 2.0 – nettside

Statisk, interaktiv presentasjon av notatet «Havbruksforvaltning 2.0: argumentet for en raskere og bedre prosess»:
hvordan norsk havbruksforvaltning virker i dag, og hvordan et raskere og bedre system kan virke.

Alt som publiseres ligger i `site/`.
Ingen byggesteg. Eneste eksterne avhengighet er skrifttypen Inter fra Google Fonts.

- `site/index.html` – innhold og struktur
- `site/styles.css` – layout og visualiseringer, med farger fra Designsystemet-tokenene
- `site/app.js` – de interaktive visningene
- `site/vendor/designsystemet/` – CSS fra [Designsystemet](https://designsystemet.no)
  (`@digdir/designsystemet-css` 1.23.0, MIT-lisens): komponenter og standardtema.

Komponentene (`ds-button`, `ds-tag`, `ds-alert`, `ds-table`, `ds-field`/`ds-input`,
`ds-toggle-group`, `ds-details`) brukes direkte i markupen. Lyst/mørkt tema styres med
`data-color-scheme` på `<html>` (`auto`, `light` eller `dark`). For å bytte til et eget
tema: lag det på https://theme.designsystemet.no og erstatt `site/vendor/designsystemet/theme.css`.

Lokalt: `python3 -m http.server 8000 --directory site` og åpne http://localhost:8000.

Publisering: en Cloudflare Worker med statiske filer bygger fra `main` og serverer `site/`
(https://aqio.no). Hver push til `main` publiseres automatisk.
Mappen kan også lastes opp til en hvilken som helst annen statisk vert.

Reelle tall kommer fra kildene i notatet. Tenkte søknader, fjorder, etatsutkast og
høringsinnspill er merket «Eksempel» på siden. Tall i resipientmodellen
(`BODIES` og `STOFF` i `site/app.js`) er illustrative.
