/*
  Awards blocks management
*/

function defaultBlock() {
    return {
        titre: 'Bloc de prix',
        mode: 'best',
        start: 1,
        end: 1,
        prix: '',
        categories: [],
        gender: 'any',
        unrated: 'any',
        eloMin: null,
        eloMax: null,
    };
}

function persistBlocks() {
    try {
        localStorage.setItem('palmaresBlocksV1', JSON.stringify(state.awardsBlocks || []));
    } catch (e) { /* ignore */ }
}

function loadBlocks() {
    try {
        const raw = localStorage.getItem('palmaresBlocksV1');
        if (raw) state.awardsBlocks = JSON.parse(raw);
    } catch (e) { state.awardsBlocks = []; }
}

function updateGenerateEnabled() {
    const btnGen = qs('#btnGenerate');
    if (!btnGen) return;
    btnGen.disabled = !(state.awardsBlocks && state.awardsBlocks.length > 0 && state.rows.length > 0);
}

function addBlock() {
    state.awardsBlocks.push(defaultBlock());
}

function duplicateBlock(idx) {
    const src = state.awardsBlocks[idx];
    if (!src) return;
    state.awardsBlocks.splice(idx + 1, 0, JSON.parse(JSON.stringify(src)));
}

function deleteBlock(idx) {
    state.awardsBlocks.splice(idx, 1);
}

function moveBlockUp(idx) {
    if (idx <= 0) return;
    const arr = state.awardsBlocks;
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
}

function moveBlockDown(idx) {
    const arr = state.awardsBlocks;
    if (idx >= arr.length - 1) return;
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
}

function renderBlocks() {
    const cont = qs('#blocksContainer');
    if (!cont) return;
    cont.innerHTML = '';
    state.awardsBlocks.forEach((b, idx) => {
        const div = document.createElement('div');
        div.className = 'award-block';
        div.innerHTML = `
            <div class="block-header">
                <input class="blk-title" type="text" value="${escapeHtml(b.titre || '')}" placeholder="Titre du bloc (ex: Podium Petits Poussins)"/>
                <div class="block-actions">
                    <button data-act="up">↑</button>
                    <button data-act="down">↓</button>
                    <button data-act="dup">Dupliquer</button>
                    <button data-act="del">Supprimer</button>
                </div>
            </div>
            <div class="field-row">
                <label>Place</label>
                <label><input type="radio" name="mode-${idx}" value="best" ${b.mode === 'best' ? 'checked' : ''}/> Meilleur</label>
                <label><input type="radio" name="mode-${idx}" value="range" ${b.mode === 'range' ? 'checked' : ''}/> De
                    <input class="blk-start input-sm" type="number" min="1" value="${b.start || 1}"/> à
                    <input class="blk-end input-sm" type="number" min="1" value="${b.end || 1}"/>
                </label>
            </div>
            <div class="field-row">
                <label>Elo</label>
                <label>Min <input class="blk-elo-min input-sm" type="number" value="${b.eloMin || ''}" placeholder="ex: 1000"/></label>
                <label>Max <input class="blk-elo-max input-sm" type="number" value="${b.eloMax || ''}" placeholder="ex: 2000"/></label>
            </div>
            <div class="field-row">
                <label>Prix (séparés par | )</label>
                <input class="blk-prix" type="text" value="${escapeHtml(b.prix || '')}" placeholder="ex: 1er | 2ème | 3ème"/>
            </div>
            <div class="field-row">
                <label>Catégories</label>
                <div class="cats">
                    ${CATEGORY_CODES.map(c => `
                        <label><input type="checkbox" value="${c.code}" ${b.categories?.includes(c.code) ? 'checked' : ''}/> ${c.label} (${c.code})</label>
                    `).join('')}
                </div>
            </div>
            <div class="field-row">
                <label>Genre</label>
                <label><input type="radio" name="gender-${idx}" value="any" ${b.gender === 'any' ? 'checked' : ''}/> Tous</label>
                <label><input type="radio" name="gender-${idx}" value="m" ${b.gender === 'm' ? 'checked' : ''}/> Masculin</label>
                <label><input type="radio" name="gender-${idx}" value="f" ${b.gender === 'f' ? 'checked' : ''}/> Féminin</label>
            </div>
            <div class="field-row">
                <label>Non classé</label>
                <select class="blk-unrated">
                    <option value="any" ${(!b.unrated || b.unrated === 'any') ? 'selected' : ''}>Aucun filtre</option>
                    <option value="anyUnrated" ${(b.unrated === 'anyUnrated') ? 'selected' : ''}>Tous non classés (1299 ou 1399)</option>
                    <option value="adult" ${(b.unrated === 'adult') ? 'selected' : ''}>Adultes non classés (1399)</option>
                    <option value="child" ${(b.unrated === 'child') ? 'selected' : ''}>Jeunes non classés (1299)</option>
                </select>
            </div>
        `;

        // Event handlers
        div.querySelector('.blk-title').addEventListener('input', (e) => {
            b.titre = e.target.value;
            persistBlocks();
        });
        div.querySelectorAll(`input[name="mode-${idx}"]`).forEach(r => {
            r.addEventListener('change', (e) => {
                b.mode = e.target.value;
                persistBlocks();
            });
        });
        div.querySelector('.blk-start').addEventListener('input', (e) => {
            b.start = Math.max(1, parseInt(e.target.value, 10) || 1);
            persistBlocks();
        });
        div.querySelector('.blk-end').addEventListener('input', (e) => {
            b.end = Math.max(1, parseInt(e.target.value, 10) || 1);
            persistBlocks();
        });
        div.querySelector('.blk-elo-min').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            b.eloMin = isNaN(val) ? null : val;
            persistBlocks();
        });
        div.querySelector('.blk-elo-max').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            b.eloMax = isNaN(val) ? null : val;
            persistBlocks();
        });
        div.querySelector('.blk-prix').addEventListener('input', (e) => {
            b.prix = e.target.value;
            persistBlocks();
        });
        div.querySelectorAll('.cats input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const v = e.target.value;
                if (e.target.checked) {
                    if (!b.categories) b.categories = [];
                    if (!b.categories.includes(v)) b.categories.push(v);
                } else {
                    b.categories = (b.categories || []).filter(x => x !== v);
                }
                persistBlocks();
            });
        });
        div.querySelectorAll(`input[name="gender-${idx}"]`).forEach(r => {
            r.addEventListener('change', (e) => {
                b.gender = e.target.value;
                persistBlocks();
            });
        });
        const unrSel = div.querySelector('.blk-unrated');
        if (unrSel) {
            unrSel.addEventListener('change', (e) => {
                b.unrated = e.target.value || 'any';
                persistBlocks();
            });
        }
        div.querySelector('[data-act="up"]').addEventListener('click', () => {
            moveBlockUp(idx);
            renderBlocks();
            persistBlocks();
        });
        div.querySelector('[data-act="down"]').addEventListener('click', () => {
            moveBlockDown(idx);
            renderBlocks();
            persistBlocks();
        });
        div.querySelector('[data-act="dup"]').addEventListener('click', () => {
            duplicateBlock(idx);
            renderBlocks();
            persistBlocks();
        });
        div.querySelector('[data-act="del"]').addEventListener('click', () => {
            deleteBlock(idx);
            renderBlocks();
            persistBlocks();
            updateGenerateEnabled();
        });

        cont.appendChild(div);
    });
}

function getBlocksFromUI() {
    return (state.awardsBlocks || []).map(b => ({
        titre: b.titre || 'Bloc',
        mode: b.mode === 'range' ? 'range' : 'best',
        start: Math.max(1, parseInt(b.start, 10) || 1),
        end: Math.max(1, parseInt(b.end, 10) || 1),
        prixList: String(b.prix || '').split('|').map(s => s.trim()).filter(Boolean),
        categories: Array.isArray(b.categories) ? b.categories.slice() : [],
        gender: b.gender === 'm' || b.gender === 'f' ? b.gender : 'any',
        unrated: ['any','anyUnrated','adult','child'].includes(b.unrated) ? b.unrated : 'any',
        eloMin: b.eloMin || null,
        eloMax: b.eloMax || null,
    }));
}
