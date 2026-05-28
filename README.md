# slopsmith-plugin-song-mastery

A [Slopsmith](https://github.com/byrongamatos/slopsmith) plugin that remembers the master-difficulty slider position for each song. When you return to a song you've played before, the slider is automatically restored to where you left it. Songs you haven't adjusted yet start at 100%.

## Features

- **Per-song persistence** — each song's difficulty level is stored separately; changing Song A never affects Song B
- **Automatic restore** — slider and chart filtering are applied as soon as the song loads, before the first note scrolls into view
- **Sensible default** — songs with no saved setting start at 100% (full difficulty)
- **Zero config** — no settings panel, no UI clutter; it just works in the background

## Prerequisites

- Slopsmith (web/Docker or Desktop)
- Songs must have multi-level phrase data for the difficulty slider to be active (PSARC files and phrase-aware sloppaks). Songs with a single difficulty level are unaffected.

## Installation

### Slopsmith web / Docker

```bash
cd /path/to/slopsmith/plugins
git clone https://github.com/your-username/slopsmith-plugin-song-mastery.git song_mastery
docker compose restart
```

### Slopsmith Desktop

Clone or copy the plugin folder into the Desktop app's user plugins directory (visible in **Settings → Plugins**).

| Platform | Plugins directory |
|----------|-------------------|
| Windows  | `%APPDATA%\slopsmith-desktop\plugins\` |
| macOS    | `~/Library/Application Support/slopsmith-desktop/plugins/` |
| Linux    | `~/.config/slopsmith-desktop/plugins/` |

```bash
# macOS / Linux
git clone https://github.com/your-username/slopsmith-plugin-song-mastery.git \
  ~/.config/slopsmith-desktop/plugins/song_mastery
```

> **Windows note:** Do not clone directly under `C:\Program Files\Slopsmith`. Windows protects that path. Clone into the user-writable plugins directory above, then restart the app.

After restart the plugin is active — no further setup needed.

## How it works

The plugin wraps Slopsmith's global `setMastery()` function. When the slider moves, the new value is saved to `localStorage` under the key `slopsmith-song-mastery`, keyed by the song's filename. On every `song:ready` event the plugin reads that value back and restores it — or falls back to 100% for songs that haven't been set before.

The restore applies directly to `highway.setMastery()` and the slider DOM without going back through the save path, so loading a song never writes a new entry for it.

## Storage

Values are stored in the browser's `localStorage` under the key `slopsmith-song-mastery` as a flat JSON object:

```json
{ "my_song.psarc": 65, "another_song.sloppak": 40 }
```

This data lives in the Slopsmith Desktop app-data directory (or your browser profile for the web version) and persists across sessions.

## Development

No build step. Edit `screen.js`, reload the Slopsmith page (web) or restart the app (Desktop).

## License

MIT
