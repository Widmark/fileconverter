/**
 * WLI-filbyggnad enligt Hogia Lön postlayout 214031.
 * Encoding: ANSI (Windows-1252), Radbrytning: CRLF (\r\n).
 * Ingen BOM (Byte Order Mark) – Hogia kräver ren ANSI.
 */

const CRLF = '\r\n';

/**
 * Unicode → Windows-1252 byte för 0x80-0x9F (Encoding Standard).
 * För 0xA0-0xFF mappar Unicode U+00A0-U+00FF direkt till samma byte.
 */
const UNICODE_TO_WIN1252 = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
    0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
    0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

/**
 * Konverterar sträng till Uint8Array med Windows-1252 (ANSI) encoding.
 * Använder NFC-normalisering för att hantera å, ä, ö i dekomponerad form.
 * @param {string} str
 * @returns {Uint8Array}
 */
function encodeWindows1252(str) {
    const normalized = typeof str.normalize === 'function' ? str.normalize('NFC') : str;
    try {
        const enc = new TextEncoder('windows-1252');
        return enc.encode(normalized);
    } catch (_) {}
    const bytes = [];
    for (let i = 0; i < normalized.length; i++) {
        const code = normalized.codePointAt(i);
        if (code <= 127) {
            bytes.push(code);
        } else if (UNICODE_TO_WIN1252[code] !== undefined) {
            bytes.push(UNICODE_TO_WIN1252[code]);
        } else if (code >= 0xA0 && code <= 0xFF) {
            bytes.push(code);
        } else if (code > 0xFFFF) {
            bytes.push(0x3F);
            i++;
        } else {
            bytes.push(0x3F);
        }
    }
    return new Uint8Array(bytes);
}

/**
 * Bygger en transaktionsrad enligt positionskarta 214031.
 * @param {object} tx - Formaterad transaktion från Transformer
 * @returns {string}
 */
function buildTransactionRow(tx) {
    const note = (tx.note || '').substring(0, 63);
    return (
        '214031' +
        tx.employmentId +
        tx.payTypeId +
        '          ' +
        '              ' +
        tx.quantity +
        tx.price +
        tx.amount +
        '00000' +
        tx.periodStartDate +
        tx.periodEndDate +
        note
    );
}

/**
 * Bygger hela WLI-filen som sträng.
 * @param {object} fileInfo - { companyName, softwareProduct, createdDate }
 * @param {Array} transactions - Formaterade transaktioner
 * @returns {string}
 */
function buildWliContent(fileInfo, transactions) {
    const lines = [
        '000000',
        `;Företag=${fileInfo.companyName || ''}`,
        `;Källa=${fileInfo.softwareProduct || ''}`,
        `;Datum=${fileInfo.createdDate || ''}`
    ];

    for (const tx of transactions) {
        lines.push(buildTransactionRow(tx));
    }

    lines.push('999999');
    return lines.join(CRLF);
}

const WliBuilder = {
    buildWliContent,
    buildTransactionRow,
    encodeWindows1252,
    CRLF
};
