# Excalink Plugin

An Obsidian plugin that enables smart auto-suggestion of frame names from `.excalidraw.md` files when typing `[[filename#` in the editor.

## Features

- 🔍 **Smart Frame Detection**: Automatically scans all `.excalidraw.md` files in your vault
- 🎯 **Real-time Pattern Detection**: Detects `[[filename#` typing patterns in the editor
- 🎭 **Fuzzy Search Modal**: Shows interactive frame suggestions with fuzzy matching
- 🖼️ **Frame Preview**: Visual frame suggestions with icons and file context
- 🔗 **Auto-completion**: Automatically replaces partial links with complete frame references
- 🗜️ **Format Support**: Handles both compressed and regular Excalidraw formats
- 🔧 **Smart Filename Matching**: Supports multiple filename variations and formats
- ⚡ **Debounced Input**: Optimized performance with intelligent timing
- 🎯 **Cursor Management**: Preserves cursor position and handles edge cases gracefully
- 💾 **Performance Caching**: Intelligent caching system to avoid repeated file reads
- 📡 **File Watching**: Automatically updates frame index when files change
- 📝 **Console Debugging**: Detailed logging of detected patterns and matching frames

## How to use

1. Create frames in your Excalidraw drawings and give them names
2. When typing `[[filename#` in any note, the plugin detects the pattern in real-time
3. A fuzzy search modal appears showing all matching frames from that file
4. Use ↑↓ to navigate, ↵ to select, or Esc to dismiss
5. Selecting a frame automatically inserts the complete link: `[[filename#^frame=frameName]]`
6. The cursor is positioned after the inserted link for continued editing

## Performance Features

- **Smart Caching**: Files are only re-processed when they change
- **Automatic Updates**: Frame index updates automatically when Excalidraw files are modified
- **Memory Efficient**: Uses content hashing to detect actual changes
- **Background Processing**: File watching happens automatically without user intervention
- **Debug Commands**: Use "Show Cache Statistics" command to view cache performance

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
- [x] Day 4: Frame text replacement with Obsidian block reference format (`#^frame=frameName`)
- [x] Day 5: Performance caching & automatic file watching
- [ ] Future: Advanced features & optimizations

## License

MIT License - see [LICENSE](LICENSE) file for details.
