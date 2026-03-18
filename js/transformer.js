/**
 * Affärslogik och datatransformation för Hogia Lön konverterare.
 */

const Transformer = {
    /**
     * Löneart 218 konverteras till 217 (Mertid).
     * @param {string|number} payTypeId
     * @returns {string}
     */
    convertPayTypeId(payTypeId) {
        const id = String(payTypeId).trim();
        return id === '218' ? '217' : id;
    },

    /**
     * YYYY-MM-DD → YYMMDD
     * @param {string} isoDate - T.ex. 2026-02-14
     * @returns {string} T.ex. 260214
     */
    formatDate(isoDate) {
        if (!isoDate || typeof isoDate !== 'string') return '000000';
        const trimmed = isoDate.trim();
        if (trimmed.length < 10) return '000000';
        const year = trimmed.substring(2, 4);
        const month = trimmed.substring(5, 7);
        const day = trimmed.substring(8, 10);
        return `${year}${month}${day}`;
    },

    /**
     * Nollutfyllning från vänster.
     * @param {string|number} value
     * @param {number} length
     * @returns {string}
     */
    padLeft(value, length) {
        const str = String(value);
        if (str.length >= length) return str.substring(0, length);
        return str.padStart(length, '0');
    },

    /**
     * Float × 100, int, nollutfyllning.
     * @param {number} value
     * @param {number} length
     * @returns {string}
     */
    toFixedPoint(value, length) {
        const num = typeof value === 'number' && !isNaN(value) ? value : 0;
        const intVal = Math.round(num * 100);
        return this.padLeft(Math.max(0, intVal), length);
    },

    /**
     * Transformerar en transaktion till WLI-format.
     * @param {object} tx - Raw transaktion från XML
     * @returns {object} Formaterad transaktion för WLI
     */
    transformTransaction(tx) {
        return {
            employmentId: this.padLeft(tx.employmentId || '0', 13),
            payTypeId: this.padLeft(this.convertPayTypeId(tx.payTypeId), 3),
            quantity: this.toFixedPoint(tx.quantity, 10),
            price: this.toFixedPoint(tx.price, 10),
            amount: this.toFixedPoint(tx.amount, 17),
            periodStartDate: this.formatDate(tx.periodStartDate),
            periodEndDate: this.formatDate(tx.periodEndDate),
            note: (tx.note || '').trim()
        };
    },

    /**
     * Transformerar alla transaktioner.
     * @param {Array} transactions
     * @returns {Array}
     */
    transformAll(transactions) {
        return transactions.map(tx => this.transformTransaction(tx));
    }
};
