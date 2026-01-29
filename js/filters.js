/*
  Filters and table rendering
*/

function applyFiltersAndRender() {
    const flt = {
        unratedAny: qs('#fltUnratedAny')?.checked || false,
        unratedAdult: qs('#fltUnratedAdult')?.checked || false,
        unratedChild: qs('#fltUnratedChild')?.checked || false,
        female: qs('#fltFemale')?.checked || false,
        eloMin: parseInt(qs('#fltEloMin')?.value, 10) || null,
        eloMax: parseInt(qs('#fltEloMax')?.value, 10) || null,
    };

    const catCodes = ['ppo','pou','pup','ben','min','cad','jun','sen','sep','vet'];
    const selectedCats = catCodes.filter(c => qs('#fltCat_' + c)?.checked);

    let arr = state.rows.slice();

    // First filter by selected tournament (Table view)
    if (state.selectedTableSourceUrl) {
        arr = arr.filter(r => r.sourceUrl === state.selectedTableSourceUrl);
    }

    // Apply filters (AND logic)
    if (flt.unratedAny) {
        arr = arr.filter(r => r.isUnrated1399 || r.isUnrated1299);
    }
    if (flt.unratedAdult) {
        arr = arr.filter(r => r.isUnrated1399);
    }
    if (flt.unratedChild) {
        arr = arr.filter(r => r.isUnrated1299);
    }
    if (flt.female) {
        arr = arr.filter(r => r.isFemale);
    }
    if (selectedCats.length > 0) {
        const set = new Set(selectedCats);
        arr = arr.filter(r => set.has((r.categoryCode || '').toLowerCase()));
    }
    if (flt.eloMin) {
        arr = arr.filter(r => {
            const elo = parseElo(r.eloText);
            return elo !== null && elo >= flt.eloMin;
        });
    }
    if (flt.eloMax) {
        arr = arr.filter(r => {
            const elo = parseElo(r.eloText);
            return elo !== null && elo <= flt.eloMax;
        });
    }

    state.filtered = arr;
    renderTable(arr);

    const countShown = qs('#countShown');
    if (countShown) countShown.textContent = String(arr.length);

    // Update count text based on tournament selection
    const countEl = qs('#count');
    if (countEl) {
        const source = state.sources.find(s => s.url === state.selectedTableSourceUrl);
        const tournamentTitleRaw = source ? (source.title || 'tournoi') : 'tournoi';
        // Replace <br> with spaces for display
        const div = document.createElement('div');
        div.innerHTML = tournamentTitleRaw;
        const tournamentName = div.textContent.trim().replace(/<br\s*\/?>/gi, ' ');
        countEl.textContent = String(arr.length);
        countEl.parentElement.innerHTML = `<strong id="count">${arr.length}</strong> joueurs dans ${escapeHtml(tournamentName)}`;
    }
}

function renderTable(rows) {
    const tbody = qs('#outTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();

    rows.forEach(r => {
        const tr = document.createElement('tr');

        tr.appendChild(td(r.place, 'num'));
        tr.appendChild(td(r.name));
        tr.appendChild(td(r.elo != null ? String(r.elo) : r.eloText, 'num'));
        tr.appendChild(td(r.cat));
        tr.appendChild(td(r.fede));
        tr.appendChild(td(r.ligue));
        tr.appendChild(td(r.club));
        tr.appendChild(td(r.pts, 'num'));
        tr.appendChild(td(r.trn, 'num'));
        tr.appendChild(td(r.bu, 'num'));
        tr.appendChild(td(r.perf, 'num'));

        if (r.isFemale) tr.classList.add('row-female');
        if (r.isUnrated1399 || r.isUnrated1299) tr.classList.add('row-unrated');

        frag.appendChild(tr);
    });

    tbody.appendChild(frag);
}

function td(text, cls) {
    const el = document.createElement('td');
    el.textContent = text == null ? '' : text;
    if (cls) el.className = cls;
    return el;
}

function setStatus(msg, kind = '') {
    const el = qs('#status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
}
