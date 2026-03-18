/**
 * Mapping av tidskoder/lönearter till läsbara namn.
 * Baserat på PAXML 2.3 och vanliga Hogia-koder.
 */
const PAY_TYPE_NAMES = {
    '100': 'Arbetstid',
    '010': 'Arbetstid',
    '217': 'Mertid',
    '218': 'Mertid',
    '710': 'Timlön/Övrig tid',
    '311': 'Sjukdom',
    '312': 'Sjukdom (karensdag)',
    '670': 'VAB',
    'SJK': 'Sjukdom',
    'SJK_KAR': 'Sjukdom (karensdag)',
    'VAB': 'Vård av barn',
    'TID': 'Arbetstid',
    'ARB': 'Timlön',
    'MER': 'Mertid',
    'SEM': 'Semester',
    'FPE': 'Föräldraledig',
    'PAP': 'Pappaledig',
    'PER': 'Permitterad',
    'TJL': 'Tjänstledig',
    'KOM': 'Kompledig',
    'UTB': 'Utbildning',
    'ÖT1': 'Övertid 1',
    'ÖT2': 'Övertid 2',
    'ÖT3': 'Övertid 3',
    'FRX': 'Minusflex',
    'NVX': 'Plusflex',
    'FLX': 'Flextid'
};

function getPayTypeName(code) {
    const c = String(code || '').trim();
    return PAY_TYPE_NAMES[c] || c || '–';
}
