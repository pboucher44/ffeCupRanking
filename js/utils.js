/*
  General utilities
*/

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

function toNumber(val) {
    if (val == null) return NaN;
    const s = String(val).replace(',', '.').trim();
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
}
