/*
  Main entry point - UI initialization
*/

window.addEventListener('DOMContentLoaded', async () => {
    bindUI();
    await reloadAllSources();
});

function initTabs() {
    const btnTable = qs('#tabBtnTable');
    const btnPal = qs('#tabBtnPalmares');
    const panelTable = qs('#tabTable');
    const panelPal = qs('#tabPalmares');
    if (!btnTable || !btnPal || !panelTable || !panelPal) return;

    const activate = (name) => {
        const isTable = name === 'table';
        btnTable.classList.toggle('active', isTable);
        btnPal.classList.toggle('active', !isTable);
        btnTable.setAttribute('aria-selected', isTable ? 'true' : 'false');
        btnPal.setAttribute('aria-selected', !isTable ? 'true' : 'false');
        panelTable.hidden = !isTable;
        panelPal.hidden = isTable;
        panelTable.classList.toggle('active', isTable);
        panelPal.classList.toggle('active', !isTable);
        try { localStorage.setItem('activeTabV1', name); } catch(e) {}
    };

    let saved = 'table';
    try { saved = localStorage.getItem('activeTabV1') || 'table'; } catch(e) {}
    activate(saved === 'palmares' ? 'palmares' : 'table');

    btnTable.addEventListener('click', () => activate('table'));
    btnPal.addEventListener('click', () => activate('palmares'));
}

function bindUI() {
    initTabs();

    const btnFetch = qs('#btnFetch');
    if (btnFetch) btnFetch.addEventListener('click', onFetchUrl);

    // Checkbox filters
    const baseFilters = ['fltUnratedAny', 'fltUnratedAdult', 'fltUnratedChild', 'fltFemale'];
    const catCodes = ['ppo','pou','pup','ben','min','cad','jun','sen','sep','vet'];
    const allFilters = baseFilters.concat(catCodes.map(c => 'fltCat_' + c));
    allFilters.forEach(id => {
        const el = qs('#' + id);
        if (el) el.addEventListener('change', applyFiltersAndRender);
    });

    // Elo filters
    const eloMin = qs('#fltEloMin');
    const eloMax = qs('#fltEloMax');
    if (eloMin) eloMin.addEventListener('input', applyFiltersAndRender);
    if (eloMax) eloMax.addEventListener('input', applyFiltersAndRender);

    // Awards UI
    const btnGenerate = qs('#btnGenerate');
    if (btnGenerate) btnGenerate.addEventListener('click', onGenerate);

    // Load saved blocks
    loadBlocks();
    renderBlocks();
    updateGenerateEnabled();
}

async function onFetchUrl() {
    const urlInput = qs('#urlInput');
    const url = urlInput.value.trim();
    if (!url) {
        setStatus('Veuillez saisir une URL.');
        return;
    }
    setStatus('Chargement en cours…');
    try {
        const htmlText = await fetchText(url);
        parseAndDisplay(htmlText, '', url);
        urlInput.value = '';
    } catch (e) {
        console.error(e);
        setStatus("Échec du chargement via l'URL.");
    }
}
