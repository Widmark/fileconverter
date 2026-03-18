# PAXML till Hogia Lön Konverterare

Webbapplikation som konverterar lönefiler till **Hogia Lön (.wli)** eller **PAXML 2.3 (.paxml)**. Stöder både Hogia PA-format (Tidio) och PAXML 2.3 som indata.

## Funktioner

- **Dubbel export:** Generera antingen Hogia WLI-fil (format 214031) eller PAXML 2.3
- **Interaktiv granskning:** Filtrera per tidskod, välj anställda och transaktioner
- **Tidsart-chips:** Klicka på chips i personvyn för att snabbt avmarkera/markera transaktioner per tidsart
- **PAXML 2.3-kompatibel:** Korrekt struktur med header, personal, lonetransaktioner och tidtransaktioner

## Användning

1. Öppna `index.html` i en webbläsare, eller kör servern för bästa kompatibilitet:
   ```bash
   pip install -r requirements.txt
   python server.py
   ```
   Öppna http://localhost:5000

2. Ladda upp en XML- eller PAXML-fil (dra och släpp eller klicka "Välj fil")

3. Klicka "Fortsätt till granskning"

4. Granska och justera:
   - Bocka ur tidskoder i filter för att exkludera från export
   - Expandera en person och klicka på tidsart-chips för att avmarkera/markera (grå = exkluderad)
   - Kryssa i/ur enskilda transaktioner

5. Klicka "Generera Hogia-fil (.wli)" eller "Generera PAXML 2.3 (.paxml)"

## Å, ä, ö i WLI-filen

Om svenska tecken inte visas korrekt i Hogia (t.ex. "St�d" istället för "Stöd"):

**Lösning:** Kör Python-servern – WLI-exporten går då via servern med garanterad Windows-1252 (ANSI) encoding.

## Indataformat

- **Hogia PA (Tidio):** XML med `PayTypeInstruction`-element
- **PAXML 2.3:** XML med `lonetrans` och `tidtrans` enligt [paxml.se/2.3](https://www.paxml.se/2.3/)

## Projektstruktur

```
fileconverter/
├── index.html
├── css/style.css
├── js/
│   ├── main.js          # Huvudlogik, export
│   ├── xml-parser.js     # Parsning Hogia PA + PAXML 2.3
│   ├── transformer.js    # Datum, löneart 218→217
│   ├── wli-builder.js    # WLI-export
│   ├── paxml-builder.js  # PAXML 2.3-export
│   ├── pay-type-names.js # Tidskod → namn
│   ├── state.js          # State, filtrering
│   └── review-view.js    # Granskningsvy
├── server.py             # Valfri – korrekt encoding för WLI
├── requirements.txt
├── sample.xml
├── sample-paxml.xml
└── README.md
```

## Licens

GPL-3.0
