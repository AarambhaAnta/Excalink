# Excalink Plugin

An Obsidian plugin that enables smart auto-suggestion of frame names from `.excalidraw.md` files when typing `[[filename#` in the editor.

## Features

- 🔍 **Smart Frame Detection**: Automatically scans all `.excalidraw.md` files in your vault
- 🎯 **Real-time Pattern Detection**: Detects `[[filename#` typing patterns in the editor
- 🎭 **Fuzzy Search Modal**: Shows interactive frame suggestions with fuzzy matching  
- 📅 **Smart Frame Ordering**: Displays frames in reverse chronological order (newest first)
- 🖼️ **Frame Preview**: Visual frame suggestions with icons and file context
- 🎯 **Real-time Pattern Detection**: Detects `[[filename#` typing patterns in the editor
- 🎭 **Fuzzy Search Modal**: Shows interactive frame suggestions with fuzzy matching
- � **Smart Frame Ordering**: Displays frames in reverse chronological order (newest first)
- 🆕 **Recent Frame Indicators**: Visual cues for recently created frames
- �🖼️ **Frame Preview**: Visual frame suggestions with icons and file context
- 🔗 **Auto-completion**: Automatically replaces partial links with complete frame references
- 🗜️ **Format Support**: Handles both compressed and regular Excalidraw formats
- 🔧 **Smart Filename Matching**: Supports multiple filename variations and formats
- ⚡ **Debounced Input**: Optimized performance with intelligent timing
- 🎯 **Cursor Management**: Preserves cursor position and handles edge cases gracefully
- 💾 **Performance Caching**: Intelligent caching system to avoid repeated file reads
- 📡 **File Watching**: Automatically updates frame index when files change
- 📝 **Console Debugging**: Detailed logging of detected patterns and matching frames
- 🛡️ **Robust Error Handling**: Graceful handling of malformed files and edge cases
- 🧪 **Comprehensive Testing**: Built-in test suite for validation and debugging

## How to use

1. Create frames in your Excalidraw drawings and give them names
2. When typing `[[filename#` in any note, the plugin detects the pattern in real-time
3. A fuzzy search modal appears showing all matching frames from that file (newest frames first)
4. Use ↑↓ to navigate, ↵ to select, or Esc to dismiss
5. When you type, the list filters to show matching frame names using fuzzy search
6. Selecting a frame automatically inserts the complete link: `[[filename#^frame=frameName]]`
7. The cursor is positioned after the inserted link for continued editing

## Performance Features

### Smart Caching System (Day 5)

- **Intelligent Caching**: Files are only re-processed when they change
- **Content Hashing**: Detects actual content changes, not just modification times
- **Memory Efficient**: Optimized cache structure with minimal memory footprint
- **Automatic Updates**: Frame index updates automatically when files are modified

### File Watching (Day 5)

- **Real-time Updates**: Automatic frame index updates when Excalidraw files change
- **Event Handling**: Listens for file modifications, deletions, and renames
- **Background Processing**: All updates happen seamlessly without user intervention
- **Error Recovery**: Graceful handling of file system events and edge cases

### Robust Error Handling (Day 6)

- **Malformed File Support**: Gracefully handles broken or corrupted Excalidraw files
- **Fallback Mechanisms**: Multiple parsing strategies for maximum compatibility
- **Edge Case Handling**: Comprehensive validation and boundary checking
- **User Feedback**: Clear error messages and helpful guidance for troubleshooting

## Debug Commands

Access these commands through the Command Palette (Ctrl/Cmd + P):

- **Show Cache Statistics**: View current cache performance and memory usage
- **Show Plugin Diagnostics**: Comprehensive plugin health and status information
- **Force Rescan All Files**: Manually trigger a full rescan of all Excalidraw files
- **Run Comprehensive Tests**: Execute the built-in test suite for validation

## Installation

### Manual Installation

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/excalink-plugin/`

### Development

- Clone this repo
- `npm i` to install dependencies  
- `npm run dev` to start compilation in watch mode
- Enable the plugin in Obsidian settings

## Troubleshooting

### Common Issues

1. **No frames showing up**:
   - Ensure your Excalidraw files contain named frames
   - Use "Force Rescan All Files" command to refresh the index
   - Check console for error messages

2. **Modal not appearing**:
   - Verify you're typing the correct pattern: `[[filename#`
   - Ensure the filename matches an existing Excalidraw file
   - Check "Show Plugin Diagnostics" for initialization status

3. **Performance issues**:
   - Use "Show Cache Statistics" to monitor cache usage
   - Clear cache using "Force Rescan All Files" if needed
   - Check console for performance warnings

### Getting Help

- Enable console logging to see detailed debug information
- Use the built-in diagnostic commands for troubleshooting
- Check the plugin status with "Show Plugin Diagnostics"

## Technical Architecture

### Core Components

1. **FrameIndexer**: Handles file scanning, frame extraction, and caching
2. **EditorExtension**: Manages pattern detection and editor integration
3. **FrameSuggestModal**: Provides fuzzy search interface for frame selection
4. **ExcalidrawDecompressor**: Handles compressed Excalidraw file formats

### File Processing Pipeline

1. **Discovery**: Scan vault for `.excalidraw.md` files
2. **Parsing**: Extract JSON data using multiple fallback strategies
3. **Frame Extraction**: Identify and catalog named frames
4. **Caching**: Store results with content hashing for efficiency
5. **Indexing**: Build searchable frame database

### Pattern Detection System

1. **Real-time Monitoring**: CodeMirror integration for live text analysis
2. **Debounced Processing**: Optimized performance with intelligent timing
3. **Pattern Matching**: Robust wikilink pattern detection
4. **Modal Triggering**: Smart modal activation based on context

## Roadmap

- [x] Day 1: Vault scanning & frame extraction
- [x] Day 2: Editor integration & pattern detection  
- [x] Day 3: Auto-suggestion modal with fuzzy search
- [x] Day 4: Frame text replacement with Obsidian block reference format (`#^frame=frameName`)
- [x] Day 5: Performance caching & automatic file watching
- [x] Day 6: Polish & test - Robust error handling, malformed file support, comprehensive testing
- [ ] Future: Advanced features & optimizations

## License

MIT License - see [LICENSE](LICENSE) file for details.
