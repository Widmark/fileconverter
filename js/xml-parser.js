/**
 * XML-parser för Hogia Lön konverterare.
 * Stöder både Hogia PA-format och PAXML 2.3 (paxml.se).
 */

const PAXMLParser = {
    /**
     * Hämtar textinnehåll från element, med stöd för namespace.
     * @param {Element} parent - Parent-element
     * @param {string} tagName - Taggnamn (local name)
     * @returns {string} Textinnehåll eller tom sträng
     */
    getText(parent, tagName) {
        if (!parent) return '';
        const el = parent.getElementsByTagNameNS('*', tagName)[0] ||
            parent.getElementsByTagName(tagName)[0];
        return el ? (el.textContent || '').trim() : '';
    },

    /**
     * Parsar XML-sträng till strukturerat objekt.
     * Stöder Hogia PA (pa) och PAXML 2.3 (paxml).
     * @param {string} xmlString - XML som sträng
     * @returns {{ fileInfo: object, transactions: array, employeeNames: object }}
     * @throws {Error} Vid ogiltig XML
     */
    parse(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Filen är inte en giltig XML-fil.');
        }

        const root = doc.documentElement;
        const rootName = (root.localName || root.nodeName || '').toLowerCase();

        if (rootName === 'paxml') {
            return this._parsePaxmlFormat(doc);
        }
        return this._parseHogiaPaFormat(doc);
    },

    _parseHogiaPaFormat(doc) {
        const fileInfo = this._parseFileInfo(doc);
        const transactions = this._parsePayTypeInstructions(doc);
        const employeeNames = this._parseEmployeeNames(doc);
        return { fileInfo, transactions, employeeNames };
    },

    _parsePaxmlFormat(doc) {
        const fileInfo = this._parsePaxmlHeader(doc);
        const transactions = this._parsePaxmlTransactions(doc);
        const employeeNames = this._parsePaxmlPersonal(doc);
        return { fileInfo, transactions, employeeNames };
    },

    /**
     * @param {Document} doc
     * @returns {{ companyName: string, softwareProduct: string, createdDate: string }}
     */
    _parseFileInfo(doc) {
        const fileInfoEl = doc.getElementsByTagNameNS('*', 'FileInfo')[0] ||
            doc.getElementsByTagName('FileInfo')[0];

        if (!fileInfoEl) {
            return {
                companyName: '',
                softwareProduct: '',
                createdDate: ''
            };
        }

        return {
            companyName: this.getText(fileInfoEl, 'companyName'),
            softwareProduct: this.getText(fileInfoEl, 'softwareProduct'),
            createdDate: this.getText(fileInfoEl, 'createdDate')
        };
    },

    /**
     * @param {Document} doc
     * @returns {Array<object>}
     */
    _parsePayTypeInstructions(doc) {
        const items = doc.getElementsByTagNameNS('*', 'PayTypeInstruction');

        const transactions = [];
        for (const el of items) {
            const quantity = this.getText(el, 'quantity');
            const extent = this.getText(el, 'extent');
            const quantityValue = quantity !== '' ? parseFloat(quantity) : (extent !== '' ? parseFloat(extent) : 0);

            const priceStr = this.getText(el, 'price');
            const amountStr = this.getText(el, 'amount');

            const tx = {
                employmentId: this.getText(el, 'employmentId'),
                payTypeId: this.getText(el, 'payTypeId'),
                quantity: isNaN(quantityValue) ? 0 : quantityValue,
                price: priceStr !== '' ? parseFloat(priceStr) : 0,
                amount: amountStr !== '' ? parseFloat(amountStr) : 0,
                periodStartDate: this.getText(el, 'periodStartDate'),
                periodEndDate: this.getText(el, 'periodEndDate'),
                note: this.getText(el, 'note')
            };

            if (tx.employmentId || tx.payTypeId) {
                tx.sourceType = 'lonetrans';
                transactions.push(tx);
            }
        }

        return transactions;
    },

    /**
     * Hämtar anställningsnummer -> namn om det finns i XML.
     * Söker efter Employee, Person, Anställd eller liknande.
     */
    _parseEmployeeNames(doc) {
        const names = {};
        const candidates = [
            ['Employee', ['employmentId', 'name']],
            ['Employee', ['employmentId', 'fornamn', 'efternamn']],
            ['Person', ['anstid', 'fornamn', 'efternamn']],
            ['Anstalld', ['anstallningsnummer', 'namn']],
            ['person', ['anstid', 'fornamn', 'efternamn']]
        ];
        for (const [tagName, idFields] of candidates) {
            const items = doc.getElementsByTagNameNS('*', tagName).length > 0
                ? doc.getElementsByTagNameNS('*', tagName)
                : doc.getElementsByTagName(tagName);
            for (const el of items) {
                const id = this.getText(el, idFields[0]) || this.getText(el, 'employmentId') || this.getText(el, 'anstid');
                if (!id) continue;
                let name = this.getText(el, 'name') || this.getText(el, 'namn');
                if (!name && idFields.includes('fornamn')) {
                    const f = this.getText(el, 'fornamn');
                    const e = this.getText(el, 'efternamn');
                    name = [f, e].filter(Boolean).join(' ');
                }
                if (name) names[id.trim()] = name.trim();
            }
        }
        return names;
    },

    /**
     * PAXML 2.3: header -> fileInfo
     */
    _parsePaxmlHeader(doc) {
        const header = doc.getElementsByTagNameNS('*', 'header')[0] ||
            doc.getElementsByTagName('header')[0];
        if (!header) {
            return { companyName: '', softwareProduct: '', createdDate: '' };
        }
        const datum = this.getText(header, 'datum');
        const dateStr = datum ? datum.substring(0, 10) : '';
        return {
            companyName: this.getText(header, 'foretagnamn'),
            softwareProduct: this.getText(header, 'programnamn'),
            createdDate: dateStr
        };
    },

    /**
     * PAXML 2.3: lonetrans + tidtrans -> transactions
     */
    _parsePaxmlTransactions(doc) {
        const transactions = [];

        const lonetransList = doc.getElementsByTagNameNS('*', 'lonetrans') ||
            doc.getElementsByTagName('lonetrans');
        for (const el of lonetransList) {
            const tx = this._parseLonetrans(el);
            if (tx) transactions.push(tx);
        }

        const tidtransList = doc.getElementsByTagNameNS('*', 'tidtrans') ||
            doc.getElementsByTagName('tidtrans');
        for (const el of tidtransList) {
            const tx = this._parseTidtrans(el);
            if (tx) transactions.push(tx);
        }

        return transactions;
    },

    _parseLonetrans(el) {
        const anstid = el.getAttribute('anstid') || this.getText(el, 'anstid') || '';
        const lonart = this.getText(el, 'lonart') || this.getText(el, 'lonkod') || '';
        const antal = this.getText(el, 'antal');
        const apris = this.getText(el, 'apris');
        const belopp = this.getText(el, 'belopp');
        const datumfrom = this.getText(el, 'datumfrom');
        const datumtom = this.getText(el, 'datumtom');
        const info = this.getText(el, 'info');

        const qty = antal !== '' ? parseFloat(antal) : 0;
        const price = apris !== '' ? parseFloat(apris) : 0;
        const amount = belopp !== '' ? parseFloat(belopp) : 0;

        const periodFrom = datumfrom ? datumfrom.substring(0, 10) : '';
        const periodTo = datumtom ? datumtom.substring(0, 10) : '';

        if (!anstid && !lonart) return null;

        return {
            employmentId: anstid.trim(),
            payTypeId: lonart.trim(),
            quantity: isNaN(qty) ? 0 : qty,
            price: isNaN(price) ? 0 : price,
            amount: isNaN(amount) ? 0 : amount,
            periodStartDate: periodFrom,
            periodEndDate: periodTo,
            note: info,
            sourceType: 'lonetrans'
        };
    },

    _parseTidtrans(el) {
        const anstid = el.getAttribute('anstid') || '';
        const tidkod = this.getText(el, 'tidkod') || '';
        const timmar = this.getText(el, 'timmar');
        const omfattning = this.getText(el, 'omfattning');
        const datumfrom = this.getText(el, 'datumfrom');
        const datumtom = this.getText(el, 'datumtom');
        const datum = this.getText(el, 'datum');
        const info = this.getText(el, 'info');

        let qty = 0;
        if (timmar !== '') qty = parseFloat(timmar);
        else if (omfattning !== '') qty = parseFloat(omfattning);

        const periodFrom = (datumfrom || datum || '').substring(0, 10);
        const periodTo = (datumtom || datum || '').substring(0, 10);

        if (!anstid && !tidkod) return null;

        return {
            employmentId: anstid.trim(),
            payTypeId: tidkod.trim(),
            quantity: isNaN(qty) ? 0 : qty,
            price: 0,
            amount: 0,
            periodStartDate: periodFrom,
            periodEndDate: periodTo,
            note: info,
            sourceType: 'tidtrans'
        };
    },

    /**
     * PAXML 2.3: personal/person -> employeeNames
     */
    _parsePaxmlPersonal(doc) {
        const names = {};
        const persons = doc.getElementsByTagNameNS('*', 'person') ||
            doc.getElementsByTagName('person');
        for (const el of persons) {
            const anstid = el.getAttribute('anstid') || this.getText(el, 'anstid') || '';
            const fornamn = this.getText(el, 'fornamn');
            const efternamn = this.getText(el, 'efternamn');
            const name = [fornamn, efternamn].filter(Boolean).join(' ').trim();
            if (anstid && name) names[anstid.trim()] = name;
        }
        return names;
    }
};
