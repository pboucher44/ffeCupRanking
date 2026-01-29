/*
  PDF generation and export
*/

function buildAwardsFromBlocks(rows, blocks, allowMultiple = true) {
    const results = [];
    const byKey = (r) => [r.ptsNum, r.buNum, r.perfNum, r.eloNum].map(x => (isFinite(x) ? x : -Infinity));

    // Keep track of winners across all blocks to avoid duplicates
    const winnerNames = new Set();

    for (const b of blocks) {
        let cand = rows.slice();

        // Filter by sourceUrl (tournament)
        if (b.sourceUrl) {
            cand = cand.filter(r => r.sourceUrl === b.sourceUrl);
        }

        // Filter by categories
        if (b.categories && b.categories.length) {
            const set = new Set(b.categories);
            cand = cand.filter(r => set.has((r.category || '').toLowerCase()));
        }

        // Filter by gender
        if (b.gender && b.gender !== 'any') {
            cand = cand.filter(r => (String(r.genre || '').toLowerCase() === b.gender));
        }

        // Filter by unrated status
        if (b.unrated && b.unrated !== 'any') {
            if (b.unrated === 'anyUnrated') {
                cand = cand.filter(r => r.isUnrated1399 || r.isUnrated1299);
            } else if (b.unrated === 'adult') {
                cand = cand.filter(r => r.isUnrated1399);
            } else if (b.unrated === 'child') {
                cand = cand.filter(r => r.isUnrated1299);
            }
        }

        // Filter by Elo range
        if (b.eloMin) {
            cand = cand.filter(r => r.eloNum !== null && r.eloNum >= b.eloMin);
        }
        if (b.eloMax) {
            cand = cand.filter(r => r.eloNum !== null && r.eloNum <= b.eloMax);
        }

        // Sort candidates by tiebreakers
        const sorted = cand.slice().sort((a, b) => {
            const ka = byKey(a);
            const kb = byKey(b);
            for (let i = 0; i < ka.length; i++) {
                if (kb[i] !== ka[i]) return kb[i] - ka[i];
            }
            return a.placeNum - b.placeNum;
        });

        // Select winners
        let winners = [];
        if (!allowMultiple) {
            // Filter out already winners
            const sortedWithoutWinners = sorted.filter(r => !winnerNames.has(r.name));
            if (b.mode === 'best') {
                winners = sortedWithoutWinners.slice(0, 1);
            } else {
                const start = Math.min(b.start, b.end) - 1;
                const end = Math.max(b.start, b.end);
                winners = sortedWithoutWinners.slice(start, end);
            }
        } else {
            // Allow multiple winners (default behavior)
            if (b.mode === 'best') {
                winners = sorted.slice(0, 1);
            } else {
                // Take positions within filtered candidates
                const start = Math.min(b.start, b.end) - 1;
                const end = Math.max(b.start, b.end);
                winners = sorted.slice(start, end);
            }
        }

        // Build result lines
        const lines = [];
        if (b.mode === 'best') {
            const label = b.prixList[0] || 'Prix';
            const winner = winners[0] || null;
            if (winner && !allowMultiple) {
                winnerNames.add(winner.name);
            }
            lines.push({label, winner});
        } else {
            const a = Math.min(b.start, b.end);
            const e = Math.max(b.start, b.end);
            let i = 0;
            for (let rank = a; rank <= e; rank++) {
                const label = b.prixList[i] || `Place ${rank}`;
                const w = winners[i] || null;
                if (w && !allowMultiple) {
                    winnerNames.add(w.name);
                }
                lines.push({label, winner: w});
                i++;
            }
        }

        results.push({ titre: b.titre, lines, sourceUrl: b.sourceUrl || '' });
    }

    return results;
}

function setGenStatus(msg, kind = '') {
    const el = qs('#genStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
}

async function onGenerate() {
    try {
        const blocks = getBlocksFromUI();
        if (!blocks.length) {
            setGenStatus('Ajoutez au moins un bloc de palmarès.');
            return;
        }
        if (!state.rows.length) {
            setGenStatus('Aucune ligne de résultats. Chargez d\'abord une URL FFE.');
            return;
        }
        setGenStatus('Génération en cours…');

        // Enrich rows with computed fields
        const enriched = state.rows.map(r => ({
            ...r,
            placeNum: parseInt(String(r.place).replace(/[^0-9]/g, ''), 10) || 0,
            ptsNum: toNumber(r.pts),
            buNum: toNumber(r.bu),
            perfNum: toNumber(r.perf),
            eloNum: parseElo(r.eloText),
            category: r.categoryCode || parseCat(r.cat).categoryCode,
            genre: (typeof r.genre === 'string' ? r.genre : (parseCat(r.cat).genre)),
        }));

        // Group blocks by sourceUrl (tournament)
        const blocksBySource = {};
        blocks.forEach(b => {
            const url = b.sourceUrl || '';
            if (!blocksBySource[url]) {
                blocksBySource[url] = [];
            }
            blocksBySource[url].push(b);
        });

        // Build awards for each tournament with its own allowMultiple option
        const allAwards = [];
        for (const sourceUrl of Object.keys(blocksBySource)) {
            const allowMultiple = getTournamentOption(sourceUrl, 'allowMultipleWinners', true);
            const tournamentBlocks = blocksBySource[sourceUrl];
            const tournamentAwards = buildAwardsFromBlocks(enriched, tournamentBlocks, allowMultiple);
            allAwards.push(...tournamentAwards);
        }

        const pdfBytes = await renderPalmaresPdf(allAwards);

        // Auto-download PDF
        if (pdfBytes && pdfBytes.byteLength) {
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = 'palmares.pdf';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(pdfUrl); a.remove(); }, 0);
        }
        setGenStatus('Palmarès généré.', 'ok');
    } catch (err) {
        console.error(err);
        setGenStatus('Erreur pendant la génération.', '');
    }
}

async function renderPalmaresPdf(awards) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return new Uint8Array();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Group awards by sourceUrl (tournament)
    const awardsBySource = new Map();
    for (const award of awards) {
        const key = award.sourceUrl || '';
        if (!awardsBySource.has(key)) {
            awardsBySource.set(key, []);
        }
        awardsBySource.get(key).push(award);
    }

    // Determine page order: specific sources first
    const sourceOrder = [];
    for (const src of state.sources) {
        if (awardsBySource.has(src.url)) {
            sourceOrder.push(src.url);
        }
    }

    let isFirstPage = true;

    // Render one page per tournament
    for (const sourceUrl of sourceOrder) {
        const sourceAwards = awardsBySource.get(sourceUrl);
        if (!sourceAwards || sourceAwards.length === 0) continue;

        // Add new page (except for first)
        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        let y = 20;

        // Find source info
        const source = state.sources.find(s => s.url === sourceUrl);

        // Tournament title (handle <br> tags)
        if (source && source.title) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);

            // More permissive regex to match <br> tags
            const titleLines = source.title.split(/<br\s*\/?>/gi);

            titleLines.forEach((line, idx) => {
                if (idx > 0) y += 8;
                const div = document.createElement('div');
                div.innerHTML = line;
                const cleanLine = div.textContent.trim();
                doc.text(cleanLine, centerX, y, { align: 'center' });
            });
            y += 8;
        }

        // Tournament URL
        if (source && source.url) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text(source.url, centerX, y, { align: 'center' });
            y += 8;
        }

        // Main title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Palmarès des Récompenses', centerX, y, { align: 'center' });
        y += 12;

        // Award blocks for this tournament
        doc.setFontSize(11);
        for (const blk of sourceAwards) {
            if (y > 270) { doc.addPage(); y = 20; }

            // Block title (uppercase, centered)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(blk.titre.toUpperCase(), centerX, y, { align: 'center' });
            y += 8;

            // Award lines
            doc.setFontSize(11);
            for (const l of blk.lines) {
                if (y > 280) { doc.addPage(); y = 20; }

                const w = l.winner;
                if (w) {
                    // Label (bold)
                    doc.setFont('helvetica', 'bold');
                    const labelText = `${l.label} : `;
                    doc.text(labelText, 15, y);
                    const labelWidth = doc.getTextWidth(labelText);

                    // Name (bold)
                    const nameText = `${w.name} - `;
                    doc.text(nameText, 15 + labelWidth, y);
                    const nameWidth = doc.getTextWidth(nameText);

                    // Club (italic)
                    doc.setFont('helvetica', 'italic');
                    const clubText = `${w.club || '?'} - `;
                    doc.text(clubText, 15 + labelWidth + nameWidth, y);
                    const clubWidth = doc.getTextWidth(clubText);

                    // Stats (normal)
                    doc.setFont('helvetica', 'normal');
                    const statsText = `(Clt ${w.placeNum}, ${w.ptsNum} pts)`;
                    doc.text(statsText, 15 + labelWidth + nameWidth + clubWidth, y);
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${l.label} : `, 15, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text('—', 15 + doc.getTextWidth(`${l.label} : `), y);
                }
                y += 6;
            }
            y += 6;
        }
    }

    return doc.output('arraybuffer');
}
