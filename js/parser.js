/*
  FFE HTML parsing
*/

async function fetchText(url) {
    const resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.text();
}

function parseHtmlToRows(htmlText) {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');

    // Extract tournament title if present
    let title = '';
    const titleCell = doc.querySelector('tr.papi_titre td');
    if (titleCell) {
        title = titleCell.textContent.trim();
        document.title = `FFE — ${title}`;
    }

    // Get all ranking rows
    const trs = qsa('tr.papi_liste_f, tr.papi_liste_c', doc);
    const rows = trs.map(tr => mapRow(tr)).filter(Boolean);
    return { rows, title };
}

function mapRow(tr) {
    const tds = qsa('td', tr);
    if (tds.length < 12) return null;

    // Column mapping:
    // 0: Place, 1: (icon), 2: Name, 3: Elo, 4: Category, 5: Federation,
    // 6: League, 7: Club, 8: Points, 9: Rounds, 10: Buchholz, 11: Performance
    const getText = (td) => td.textContent.replace(/\u00A0/g, ' ').trim();

    const place = getText(tds[0]);
    const name = getText(tds[2]).replace(/^\*/, '');
    const eloText = getText(tds[3]);
    const cat = getText(tds[4]);
    const fede = tds[5].querySelector('img')?.getAttribute('src') || getText(tds[5]);
    const ligue = getText(tds[6]);
    const club = getText(tds[7]);
    const pts = getText(tds[8]);
    const trn = getText(tds[9]);
    const bu = getText(tds[10]);
    const perf = getText(tds[11]);

    const elo = eloText;
    const {isFemale, categoryCode, genre} = parseCat(cat);

    const isUnrated1399 = eloText === '1399 E';
    const isUnrated1299 = eloText === '1299 E';

    return {
        place, name, elo, eloText, cat,
        isFemale, categoryCode, genre,
        isUnrated1399, isUnrated1299,
        fede, ligue, club, pts, trn, bu, perf,
    };
}

function parseElo(eloText) {
    if (!eloText) return null;
    const m = String(eloText).match(/(\d{3,4})/);
    return m ? Number(m[1]) : null;
}

function parseCat(cat) {
    const text = (cat || '').trim();
    const isFemale = /[A-Za-zÀ-ÿ]F$/.test(text);
    const base = text.replace(/[\s\u00A0]/g, '');
    const baseNoGender = base.replace(/[FfMm]$/, '');
    const categoryCode = baseNoGender.toLowerCase();
    const genre = isFemale ? 'f' : 'm';
    return {isFemale, categoryCode, genre};
}

function parseAndDisplay(htmlText, sourceLabel = '', url = '') {
    const { rows, title } = parseHtmlToRows(htmlText);

    state.rows = rows;
    state.tournamentTitle = title;
    state.tournamentUrl = url;
    applyFiltersAndRender();
    updateGenerateEnabled();

    qs('#count').textContent = String(rows.length);
    if (sourceLabel) {
        setStatus(`Chargé (${sourceLabel}) — ${rows.length} lignes.`, 'ok');
    }
}
