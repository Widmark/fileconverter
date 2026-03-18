/**
 * PAXML 2.3-export enligt paxml.se/2.3.
 */

function escapeXml(str) {
    if (str == null || str === '') return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Returnerar YYYY-MM-DD för xs:date (datumfrom, datumtom). */
function formatDateForPaxml(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const t = isoDate.trim();
    if (t.length < 10) return '';
    return t.substring(0, 10);
}

function convertPayTypeId(id) {
    const s = String(id || '').trim();
    return s === '218' ? '217' : s;
}

function buildLonetrans(tx) {
    const lonart = convertPayTypeId(tx.payTypeId);
    const anstid = escapeXml(tx.employmentId || '');
    const datumfrom = formatDateForPaxml(tx.periodStartDate);
    const datumtom = formatDateForPaxml(tx.periodEndDate);
    const antal = tx.quantity != null && !isNaN(tx.quantity) ? tx.quantity : '';
    const apris = tx.price != null && !isNaN(tx.price) ? tx.price : '';
    const belopp = tx.amount != null && !isNaN(tx.amount) ? tx.amount : '';
    const info = escapeXml(tx.note || '');

    const parts = [];
    if (lonart) parts.push(`<lonart>${escapeXml(lonart)}</lonart>`);
    if (datumfrom) parts.push(`<datumfrom>${datumfrom}</datumfrom>`);
    if (datumtom) parts.push(`<datumtom>${datumtom}</datumtom>`);
    if (antal !== '') parts.push(`<antal>${antal}</antal>`);
    if (apris !== '') parts.push(`<apris>${apris}</apris>`);
    if (belopp !== '') parts.push(`<belopp>${belopp}</belopp>`);
    if (info) parts.push(`<info>${info}</info>`);

    return `<lonetrans anstid="${anstid}">${parts.join('')}</lonetrans>`;
}

function buildTidtrans(tx) {
    const tidkod = convertPayTypeId(tx.payTypeId);
    const anstid = escapeXml(tx.employmentId || '');
    const datumfrom = formatDateForPaxml(tx.periodStartDate);
    const datumtom = formatDateForPaxml(tx.periodEndDate);
    const timmar = tx.quantity != null && !isNaN(tx.quantity) ? tx.quantity : '';
    const info = escapeXml(tx.note || '');

    const parts = [];
    if (tidkod) parts.push(`<tidkod>${escapeXml(tidkod)}</tidkod>`);
    if (datumfrom) parts.push(`<datumfrom>${datumfrom}</datumfrom>`);
    if (datumtom) parts.push(`<datumtom>${datumtom}</datumtom>`);
    if (timmar !== '') parts.push(`<timmar>${timmar}</timmar>`);
    if (info) parts.push(`<info>${info}</info>`);

    return `<tidtrans anstid="${anstid}">${parts.join('')}</tidtrans>`;
}

function parsePersonName(fullName) {
    if (!fullName || typeof fullName !== 'string') return { fornamn: '', efternamn: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { fornamn: '', efternamn: '' };
    if (parts.length === 1) return { fornamn: parts[0], efternamn: '' };
    return { fornamn: parts[0], efternamn: parts.slice(1).join(' ') };
}

const PaxmlBuilder = {
    /**
     * Bygger PAXML 2.3 XML-sträng enligt paxml.se/2.3.
     * @param {object} fileInfo - { companyName, softwareProduct, createdDate }
     * @param {Array} transactions - Raw transaktioner
     * @param {object} employeeNames - { employmentId: name }
     * @returns {string}
     */
    buildPaxml23(fileInfo, transactions, employeeNames = {}) {
        const foretagnamn = escapeXml(fileInfo.companyName || '');
        const programnamn = escapeXml(fileInfo.softwareProduct || '');
        let datum;
        if (fileInfo.createdDate && fileInfo.createdDate.trim().length >= 10) {
            const d = fileInfo.createdDate.trim().substring(0, 10);
            datum = d.length >= 19 ? d.substring(0, 19) : d + 'T00:00:00';
        } else {
            datum = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        }

        const headerParts = [
            '<version>2.3</version>',
            `<datum>${datum}</datum>`,
            foretagnamn ? `<foretagnamn>${foretagnamn}</foretagnamn>` : '',
            programnamn ? `<programnamn>${programnamn}</programnamn>` : ''
        ].filter(Boolean);

        const lonetransList = [];
        const tidtransList = [];
        for (const tx of transactions) {
            if (tx.sourceType === 'tidtrans') {
                tidtransList.push(buildTidtrans(tx));
            } else {
                lonetransList.push(buildLonetrans(tx));
            }
        }

        const empIds = [...new Set(transactions.map(tx => tx.employmentId))].filter(Boolean).sort();
        const personal = empIds.map(anstid => {
            const name = employeeNames[anstid] || '';
            const { fornamn, efternamn } = parsePersonName(name);
            return `    <person anstid="${escapeXml(anstid)}">
      <fornamn>${escapeXml(fornamn || anstid)}</fornamn>
      <efternamn>${escapeXml(efternamn)}</efternamn>
    </person>`;
        }).join('\n');

        const lonetrans = lonetransList.join('\n    ');
        const tidtrans = tidtransList.join('\n    ');

        return `<?xml version="1.0" encoding="UTF-8"?>
<paxml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://www.paxml.se/2.3/paxml.xsd">
  <header>
    ${headerParts.join('\n    ')}
  </header>
  <personal>
${personal}
  </personal>
  <lonetransaktioner>
    ${lonetrans || ''}
  </lonetransaktioner>
  <tidtransaktioner>
    ${tidtrans || ''}
  </tidtransaktioner>
</paxml>`;
    }
};
