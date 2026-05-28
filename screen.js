(function () {
    'use strict';

    // Per-Song Mastery plugin
    //
    // Saves each song's difficulty slider position to localStorage keyed by
    // filename, and restores it automatically when that song loads.
    // Songs that have never been explicitly set start at 100%.
    // Library cards and tree rows show a badge for songs with a saved value.

    if (window.__songMasteryPluginLoaded) return;
    window.__songMasteryPluginLoaded = true;

    const STORAGE_KEY = 'slopsmith-song-mastery';

    // ── Storage ───────────────────────────────────────────────────────────

    function getMasteryMap() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (_) { return {}; }
    }

    function load(filename) {
        if (!filename) return null;
        const v = getMasteryMap()[filename];
        return (typeof v === 'number' && Number.isFinite(v))
            ? Math.max(0, Math.min(100, v))
            : null;
    }

    function save(filename, pct) {
        if (!filename) return;
        try {
            const map = getMasteryMap();
            map[filename] = pct;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    function getFilename() {
        return (window.slopsmith && window.slopsmith.currentSong)
            ? window.slopsmith.currentSong.filename
            : null;
    }

    function filenameFromEl(el) {
        try { return el.dataset.play ? decodeURIComponent(el.dataset.play) : null; }
        catch (_) { return null; }
    }

    // ── Library badges ────────────────────────────────────────────────────

    const CARD_BADGE = 'sm-mastery-badge-card';
    const ROW_BADGE  = 'sm-mastery-badge-row';

    const _style = document.createElement('style');
    _style.textContent = `
        .${CARD_BADGE} {
            position: absolute; bottom: 4px; right: 4px;
            background: rgba(64, 128, 224, 0.88); color: #fff;
            font-size: 10px; font-weight: 700; line-height: 1.6;
            padding: 0 5px; border-radius: 3px; pointer-events: none;
            letter-spacing: 0.02em;
        }
        .${ROW_BADGE} {
            color: #4080e0; font-size: 11px; font-weight: 600;
            white-space: nowrap; flex-shrink: 0;
        }
    `;
    document.head.appendChild(_style);

    function updateCardBadge(card, pct) {
        let badge = card.querySelector('.' + CARD_BADGE);
        if (typeof pct !== 'number') {
            badge?.remove();
            return;
        }
        const art = card.querySelector('.card-art');
        if (!art) return;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = CARD_BADGE;
            art.appendChild(badge);
        }
        badge.textContent = pct + '%';
        badge.title = `Difficulty set to ${pct}% — restored automatically on play`;
    }

    function updateRowBadge(row, pct) {
        let badge = row.querySelector('.' + ROW_BADGE);
        if (typeof pct !== 'number') {
            badge?.remove();
            return;
        }
        const tail = row.querySelector(':scope > .flex.items-center.flex-shrink-0')
            || row.querySelector(':scope > div:last-child')
            || row;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = ROW_BADGE;
            // Insert before the last child (duration) so it sits with the other chips.
            const last = tail.lastElementChild;
            if (last) tail.insertBefore(badge, last);
            else tail.appendChild(badge);
        }
        badge.textContent = pct + '%';
        badge.title = `Difficulty set to ${pct}% — restored automatically on play`;
    }

    function scanLibrary() {
        const map = getMasteryMap();
        document.querySelectorAll('.song-card[data-play]').forEach(card => {
            updateCardBadge(card, map[filenameFromEl(card)]);
        });
        document.querySelectorAll('.song-row[data-play]').forEach(row => {
            updateRowBadge(row, map[filenameFromEl(row)]);
        });
    }

    // Update badges for a single filename without a full scan.
    function updateBadgesForFile(filename, pct) {
        const encoded = encodeURIComponent(filename);
        document.querySelectorAll(`.song-card[data-play]`).forEach(card => {
            if (filenameFromEl(card) === filename) updateCardBadge(card, pct);
        });
        document.querySelectorAll(`.song-row[data-play]`).forEach(row => {
            if (filenameFromEl(row) === filename) updateRowBadge(row, pct);
        });
    }

    // Coalesced MutationObserver — one rAF per batch of DOM changes.
    let _rafPending = false;
    new MutationObserver(() => {
        if (_rafPending) return;
        _rafPending = true;
        requestAnimationFrame(() => { _rafPending = false; scanLibrary(); });
    }).observe(document.body, { childList: true, subtree: true });

    if (window.slopsmith) {
        window.slopsmith.on('screen:changed', function (e) {
            const id = e.detail?.id;
            if (id === 'home' || id === 'favorites') scanLibrary();
        });
    }

    scanLibrary();

    // ── setMastery wrapper ────────────────────────────────────────────────
    // Read the committed slider value after calling the original so we save
    // exactly what core applied (its clamp/round) rather than re-deriving it.

    const _originalSetMastery = window.setMastery;
    if (typeof _originalSetMastery === 'function') {
        window.setMastery = function (v) {
            _originalSetMastery(v);
            const slider = document.getElementById('mastery-slider');
            const committed = slider ? parseInt(slider.value, 10) : NaN;
            if (Number.isFinite(committed)) {
                const filename = getFilename();
                save(filename, committed);
                if (filename) updateBadgesForFile(filename, committed);
            }
        };
    }

    // ── song:ready ────────────────────────────────────────────────────────
    // Deliberately bypasses window.setMastery to avoid triggering the
    // debounced server POST that updates the global master_difficulty —
    // restoring a saved value on song load should not count as a user change.

    if (window.slopsmith) {
        window.slopsmith.on('song:ready', function (e) {
            if (!e.detail?.hasPhraseData) {
                applyMastery(100);
                return;
            }
            const filename = getFilename();
            const saved = load(filename);
            applyMastery(saved !== null ? saved : 100);
        });
    }

    function applyMastery(pct) {
        const slider = document.getElementById('mastery-slider');
        const label  = document.getElementById('mastery-label');
        if (slider) { slider.value = pct; window.handleSliderInput?.(slider); }
        if (label) label.textContent = pct + '%';
        window.highway?.setMastery(pct / 100);
    }

})();
