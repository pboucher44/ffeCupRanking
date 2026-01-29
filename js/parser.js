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
    const base = text.replace(/[\s\u00A0]/g, '');
    const isFemale = /F$/i.test(base);
    const baseNoGender = base.replace(/[FfMm]$/, '');
    const categoryCode = baseNoGender.toLowerCase();
    const genre = isFemale ? 'f' : 'm';
    return {isFemale, categoryCode, genre};
}

function addSource(htmlText, url) {
    const { rows, title } = parseHtmlToRows(htmlText);

    // Check if URL already loaded
    const existing = state.sources.find(s => s.url === url);
    if (existing) {
        return { added: false, reason: 'already_loaded', title };
    }

    // Add source with its rows
    state.sources.push({ url, title, rows });

    // Initialize tournament options with default values
    if (!state.tournamentOptions[url]) {
        state.tournamentOptions[url] = {
            allowMultipleWinners: true // Default: allow multiple winners
        };
    }

    // Merge all rows from all sources
    rebuildRows();
    persistSourceUrls();
    persistTournamentOptions();

    return { added: true, title, rowCount: rows.length };
}

function removeSource(url) {
    const idx = state.sources.findIndex(s => s.url === url);
    if (idx === -1) return false;

    state.sources.splice(idx, 1);

    // Remove blocks for this source
    state.awardsBlocks = state.awardsBlocks.filter(b => b.sourceUrl !== url);
    persistBlocks();

    // Remove tournament options
    if (state.tournamentOptions[url]) {
        delete state.tournamentOptions[url];
        persistTournamentOptions();
    }

    rebuildRows();
    persistSourceUrls();
    return true;
}

function persistSourceUrls() {
    try {
        const urls = state.sources.map(s => s.url);
        localStorage.setItem('sourceUrlsV1', JSON.stringify(urls));
    } catch (e) { /* ignore */ }
}

function persistTournamentOptions() {
    try {
        localStorage.setItem('tournamentOptionsV1', JSON.stringify(state.tournamentOptions || {}));
    } catch (e) { /* ignore */ }
}

function loadTournamentOptions() {
    try {
        const raw = localStorage.getItem('tournamentOptionsV1');
        if (raw) {
            state.tournamentOptions = JSON.parse(raw);
        } else {
            state.tournamentOptions = {};
        }
    } catch (e) { state.tournamentOptions = {}; }
}

function getTournamentOption(url, key, defaultValue = null) {
    if (!state.tournamentOptions[url]) {
        state.tournamentOptions[url] = {};
    }
    if (state.tournamentOptions[url][key] === undefined) {
        return defaultValue;
    }
    return state.tournamentOptions[url][key];
}

function setTournamentOption(url, key, value) {
    if (!state.tournamentOptions[url]) {
        state.tournamentOptions[url] = {};
    }
    state.tournamentOptions[url][key] = value;
    persistTournamentOptions();
}

function loadSourceUrls() {
    try {
        const raw = localStorage.getItem('sourceUrlsV1');
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

async function reloadAllSources() {
    const urls = loadSourceUrls();
    if (!urls.length) return;

    setStatus(`Chargement de ${urls.length} source(s)…`);

    // Load tournament options first
    loadTournamentOptions();

    for (const url of urls) {
        try {
            const htmlText = await fetchText(url);
            const { rows, title } = parseHtmlToRows(htmlText);
            state.sources.push({ url, title, rows });
            // Initialize tournament options if not exists
            if (!state.tournamentOptions[url]) {
                state.tournamentOptions[url] = {
                    allowMultipleWinners: true
                };
            }
        } catch (e) {
            console.error('Failed to reload:', url, e);
        }
    }

    rebuildRows();
    if (state.sources.length > 0) {
        setStatus(`${state.sources.length} source(s) chargée(s).`, 'ok');
    } else {
        setStatus('');
    }
}

function rebuildRows() {
    // Merge all rows from all sources, adding sourceUrl to each row
    state.rows = state.sources.flatMap(s => s.rows.map(r => ({ ...r, sourceUrl: s.url })));
    applyFiltersAndRender();
    updateGenerateEnabled();
    updateSourcesUI();
    renderBlocks(); // Refresh tournament containers in palmares

    qs('#count').textContent = String(state.rows.length);
}

function updateSourcesUI() {
    const container = qs('#sourcesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (state.sources.length === 0) {
        container.innerHTML = '<div class="no-sources">Aucune source chargée</div>';
        return;
    }

    state.sources.forEach((src, idx) => {
        const div = document.createElement('div');
        div.className = 'source-item';
        div.innerHTML = `
            <span class="source-title">${escapeHtml(src.title || 'Sans titre')}</span>
            <span class="source-count">${src.rows.length} lignes</span>
            <button class="source-remove" data-idx="${idx}" title="Supprimer">×</button>
        `;
        div.querySelector('.source-remove').addEventListener('click', () => {
            removeSource(src.url);
        });
        container.appendChild(div);
    });
}

// Legacy function for compatibility
function parseAndDisplay(htmlText, sourceLabel = '', url = '') {
    const result = addSource(htmlText, url);
    if (result.added) {
        setStatus(`Ajouté: ${result.title || 'tournoi'} (${result.rowCount} lignes)`, 'ok');
    } else {
        setStatus('Cette URL est déjà chargée.', '');
    }
}
