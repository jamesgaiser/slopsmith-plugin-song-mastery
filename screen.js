(function () {
    'use strict';

    // Per-Song Mastery plugin
    //
    // Saves each song's difficulty slider position to localStorage keyed by
    // filename, and restores it automatically when that song loads.
    // Songs that have never been explicitly set start at 100%.

    const STORAGE_KEY = 'slopsmith-song-mastery';

    function getFilename() {
        return (window.slopsmith && window.slopsmith.currentSong)
            ? window.slopsmith.currentSong.filename
            : null;
    }

    function load(filename) {
        if (!filename) return null;
        try {
            const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const v = map[filename];
            return (typeof v === 'number' && Number.isFinite(v))
                ? Math.max(0, Math.min(100, v))
                : null;
        } catch (_) { return null; }
    }

    function save(filename, pct) {
        if (!filename) return;
        try {
            const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            map[filename] = pct;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    function applyMastery(pct) {
        const slider = document.getElementById('mastery-slider');
        const label = document.getElementById('mastery-label');
        if (slider) {
            slider.value = pct;
            window.handleSliderInput?.(slider);
        }
        if (label) label.textContent = pct + '%';
        window.highway?.setMastery(pct / 100);
    }

    // Wrap window.setMastery to save per-song whenever the slider moves.
    const _originalSetMastery = window.setMastery;
    if (typeof _originalSetMastery === 'function') {
        window.setMastery = function (v) {
            _originalSetMastery.call(this, v);
            const parsed = parseInt(v, 10);
            if (Number.isFinite(parsed)) {
                save(getFilename(), Math.max(0, Math.min(100, parsed)));
            }
        };
    }

    // Restore per-song mastery on each song load (only when the slider is
    // enabled, i.e. the source has a multi-level phrase ladder).
    if (window.slopsmith) {
        window.slopsmith.on('song:ready', function (e) {
            if (!e.detail?.hasPhraseData) return;
            const filename = getFilename();
            const saved = load(filename);
            applyMastery(saved !== null ? saved : 100);
        });
    }

})();
