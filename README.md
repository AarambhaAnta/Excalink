# Excalink Plugin

An Obsidian plugin that enables smart auto-suggestion of frame names from `.excalidraw.md` files when typing `[[filename#` in the editor.

## Features

- 🔍 **Smart Frame Detection**: Automatically scans all `.excalidraw.md` files in your vault
- 🎯 **Real-time Pattern Detection**: Detects `[[filename#` typing patterns in the editor
- 🎭 **Fuzzy Search Modal**: Shows interactive frame suggestions with fuzzy matching
- �️ **Frame Preview**: Visual frame suggestions with icons and file context
- �🗜️ **Format Support**: Handles both compressed and regular Excalidraw formats
- 🔧 **Smart Filename Matching**: Supports multiple filename variations and formats
- ⚡ **Debounced Input**: Optimized performance with intelligent timing
- 📝 **Console Debugging**: Detailed logging of detected patterns and matching frames

## How to use

1. Create frames in your Excalidraw drawings and give them names
2. When typing `[[filename#` in any note, the plugin detects the pattern in real-time
3. A fuzzy search modal appears showing all matching frames from that file
4. Use ↑↓ to navigate, ↵ to select, or Esc to dismiss
5. Frames are highlighted with fuzzy matching for easy identification

## Installation

### Manual Installation

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/excalink-plugin/`

### Development

- Clone this repo
- `npm i` to install dependencies  
- `npm run dev` to start compilation in watch mode
- Enable the plugin in Obsidian settings

## Roadmap

- [x] Day 1: Vault scanning & frame extraction
- [x] Day 2: Editor integration & pattern detection  
- [x] Day 3: Auto-suggestion modal with fuzzy search
- [ ] Day 4+: Frame text replacement & file watching

## License

MIT License - see [LICENSE](LICENSE) file for details.
