# Excalink Plugin

An Obsidian plugin that enables smart auto-suggestion of frame names from `.excalidraw.md` files when typing `[[filename#` in the editor.

## Features

- 🔍 **Smart Frame Detection**: Automatically scans all `.excalidraw.md` files in your vault
- 🎯 **Intelligent Suggestions**: Shows frame names when typing `[[filename#`
- ⚡ **Real-time Updates**: Keeps frame index updated as you modify drawings
- 🗜️ **Format Support**: Handles both compressed and regular Excalidraw formats

## How to use

1. Create frames in your Excalidraw drawings and give them names
2. When typing `[[filename#` in any note, the plugin will suggest available frame names
3. Select a frame to create a direct link to that specific frame

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
- [ ] Day 2: Editor integration & suggestion UI
- [ ] Day 3: Real-time file watching & updates

## License

MIT License - see [LICENSE](LICENSE) file for details.
