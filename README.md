# PAXML till Hogia Lön Konverterare

Webbapplikation som konverterar lönefiler till Hogia Lön .wli eller PAXML 2.3. **Stöder både Hogia PA-format (Tidio) och PAXML 2.3** som indata. Inkluderar interaktiv granskningsvy med filtrering.

## Användning

1. Öppna `index.html` i en webbläsare eller kör `python server.py` för bästa kompatibilitet.
2. Ladda upp en XML-fil och klicka "Fortsätt till granskning".
3. Granska, filtrera och välj anställda och transaktioner.
4. Klicka "Generera Hogia-fil (.wli)" eller "Generera PAXML 2.3 (.xml)".

## Å, ä, ö i WLI-filen

Om svenska tecken inte visas korrekt i Hogia (t.ex. "St�d" istället för "Stöd"):

**Lösning:** Kör den valfria Python-servern:
```bash
pip install flask
python server.py
```
Öppna http://localhost:5000 – WLI-exporten går då via servern med garanterad Windows-1252 (ANSI) encoding.

## Projektstruktur

```
fileconverter/
├── index.html
├── css/style.css
├── js/
│   ├── main.js
│   ├── xml-parser.js
│   ├── transformer.js
│   ├── wli-builder.js
│   ├── paxml-builder.js
│   ├── pay-type-names.js
│   ├── state.js
│   └── review-view.js
├── server.py          # Valfri – för korrekt å,ä,ö i WLI
├── requirements.txt
├── sample.xml
└── README.md
```
