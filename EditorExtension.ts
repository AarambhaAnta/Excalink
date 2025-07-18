import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, ViewPlugin, PluginValue } from "@codemirror/view";
import { FrameIndexer } from "FrameIndexer";
import { FrameSuggestModal } from "FrameSuggestModal";
import { App } from "obsidian";

/**
 * EditorExtension - Handles detection of [[filename# typing patterns
 * Integrates with CodeMirror to watch for user input and cursor position
 */
export class EditorExtension {
    private frameIndexer: FrameIndexer;
    private app: App;

    constructor(frameIndexer: FrameIndexer, app: App) {
        this.frameIndexer = frameIndexer;
        this.app = app;
    }

    /**
     * Creates the CodeMirror extension for editor integration
     */
    getExtension(): Extension {
        const frameIndexer = this.frameIndexer; // Capture in closure
        const app = this.app;

        return ViewPlugin.define((view: EditorView) => {
            return new ExcalinkViewPlugin(view, frameIndexer, app);
        });
    }
}

/**
 * CodeMirror ViewPlugin that handles the actual cursor and typing detection
 */
export class ExcalinkViewPlugin implements PluginValue {
    private frameIndexer: FrameIndexer;
    private app: App;
    private debounceTimer: NodeJS.Timeout | null = null;
    private currentModal: FrameSuggestModal | null = null;

    constructor(view: EditorView, frameIndexer: FrameIndexer, app: App) {
        this.frameIndexer = frameIndexer;
        this.app = app;
        console.log('🎯 ExcalinkViewPlugin initialized');
    }
    /**
     * Called whenever the editor view updates (typing, cursor movement, etc.)
     */
    update(update: ViewUpdate): void {
        // Process if there were document changes or selection changes
        if (update.docChanged || update.selectionSet) {
            console.log('📝 Update detected - checking for [[filename# pattern...');
            
            // Clear any existing timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            
            // Debounce the pattern checking to avoid excessive modal opening
            this.debounceTimer = setTimeout(() => {
                this.checkForWikilinkPattern(update.view);
            }, 300); // 300ms debounce
        }
    }

    /**
     * Main logic to detect [[filename# patterns at cursor position
     */
    private checkForWikilinkPattern(view: EditorView): void{
        try {
            const { state } = view;
            const cursor = state.selection.main.head;

            // Get the current line
            const line = state.doc.lineAt(cursor);
            const lineText = line.text;
            const cursorInLine = cursor - line.from;

            console.log(`🔍 Checking cursor position ${cursor}`);

            // Look for wikilink patterns around cursor
            const wikilinkMatch = this.findWikilinkAtCursor(lineText, cursorInLine);

            if (wikilinkMatch) {
                console.log('🎯 Found wikilink pattern:', wikilinkMatch);
                
                // Only trigger if we have a filename and at least started typing after #
                if (wikilinkMatch.filename && wikilinkMatch.fullMatch.includes('#')) {
                    this.handleWikilinkDetection(wikilinkMatch);
                }
            } else {
                // Close any existing modal if pattern is no longer present
                if (this.currentModal) {
                    console.log('❌ Pattern no longer matches, closing modal');
                    this.currentModal.close();
                    this.currentModal = null;
                }
            }
        } catch (error) {
            console.error('❌ Error checking wikilink pattern:', error);
        }
    }

    /**
     * Find wikilink pattern around the cursor position
     */
    private findWikilinkAtCursor(lineText: string, cursorPos: number): WikilinkMatch | null {
        // Look for [[ before cursor and find the matching ]]
        let startPos = -1;
        let endPos = -1;

        // Find [[ before cursor
        for (let i = cursorPos - 1; i >= 0; i--){
            if (lineText.substring(i, i + 2) === '[[') {
                startPos = i;
                break;
            }
            // Stop if we hit another ] or new line
            if (lineText[i] === ']' || lineText[i] === '\n') {
                break;
            }
        }

        if (startPos === -1) return null;

        // Find ]] after cursor (or use cursor position if incomplete)
        for (let i = cursorPos; i < lineText.length - 1; i++) {
            if (lineText.substring(i, i + 2) === ']]') {
                endPos = i + 2;
                break;
            }
        }

        // If no closing ]], treat cursor as end
        if (endPos === -1) {
            endPos = cursorPos;
        }

        // Calculate the end index for slicing the wikilink content
        const contentEnd = endPos > cursorPos ? endPos - 2 : endPos; // Subtract 2 only if the link is complete
        const wikilinkContent = lineText.substring(startPos + 2, contentEnd);

        // Check if it contains # (indicating frame reference)
        if (wikilinkContent.includes('#')) {
            const [filename, partialFrame] = wikilinkContent.split('#', 2);

            return {
                startPos,
                endPos,
                fullMatch: lineText.substring(startPos, endPos),
                filename: filename.trim(),
                partialFrame: partialFrame || '',
                isComplete: endPos > cursorPos
            };
        }

        return null;
    }

    /**
     * Handle detected wikilink with frame reference
     */
    private handleWikilinkDetection(match: WikilinkMatch): void {
        console.log('🎯 Detected wikilink pattern:');
        console.log(`    📁 Filename: "${match.filename}"`);
        console.log(`    🔖 Partial frame: "${match.partialFrame}"`);
        console.log(`    📍 Position: ${match.startPos}-${match.endPos}`);
        console.log(`    ✅ Complete: ${match.isComplete}`);

        // Try different filename variations to find frames
        const possibleFilenames = this.generateFilenameVariations(match.filename);

        let frames = null;
        let matchedFilename = '';

        // Try each filename variation
        for (const filename of possibleFilenames) {
            const foundFrames = this.frameIndexer?.getFramesForFile(filename);
            if (foundFrames && foundFrames.length > 0) {
                frames = foundFrames;
                matchedFilename = filename;
                break;
            }
        }

        if (frames && frames.length > 0) {
            console.log(`    🖼️ Available frames in "${matchedFilename}": [${frames.map(f => f.name).join(', ')}]`);
            
            // Filter frames based on partial input if provided
            let matchingFrames = frames;
            if (match.partialFrame) {
                const cleanPartialFrame = this.cleanPartialFrame(match.partialFrame);
                matchingFrames = frames.filter(frame => 
                    frame.name.toLowerCase().includes(cleanPartialFrame.toLowerCase())
                );
                console.log(`    🎯 Matching frames for "${cleanPartialFrame}": [${matchingFrames.map(f => f.name).join(', ')}]`);
            }

            // Only show modal if there are frames to suggest
            if (matchingFrames.length > 0) {
                this.showFrameSuggestModal(matchingFrames, matchedFilename, match);
            } else {
                console.log(`    ❓ No frames match the partial input "${match.partialFrame}"`);
            }
        } else {
            console.log(`    ❌ No frames found for any variation of "${match.filename}"`);
            console.log(`    🔍 Tried: ${possibleFilenames.join(', ')}`);
            
            // Show a helpful message to the user
            console.log(`    💡 Make sure the file "${match.filename}" exists and contains frames`);
        }
    }

    /**
     * Show the frame suggestion modal
     */
    private showFrameSuggestModal(frames: any[], filename: string, match: WikilinkMatch): void {
        console.log(`🎭 Opening FrameSuggestModal with ${frames.length} frames`);
        
        // Close any existing modal first
        if (this.currentModal) {
            this.currentModal.close();
            this.currentModal = null;
        }
        
        const modal = new FrameSuggestModal(
            this.app,
            frames,
            filename,
            (selectedFrame) => {
                console.log(`✅ Frame selected: "${selectedFrame.name}"`);
                this.currentModal = null;
                // TODO: Replace the partial frame text with the selected frame name
                // This will be implemented when we integrate with the editor
            }
        );
        
        // Store reference to current modal
        this.currentModal = modal;
        
        modal.open();
        
        // Pre-fill the search if there's a partial frame
        if (match.partialFrame) {
            const cleanPartialFrame = this.cleanPartialFrame(match.partialFrame);
            // Set the input value after opening
            setTimeout(() => {
                if (modal.inputEl) {
                    modal.inputEl.value = cleanPartialFrame;
                    modal.inputEl.dispatchEvent(new Event('input'));
                }
            }, 10);
        }
        
        // Handle modal close event
        modal.onClose = () => {
            this.currentModal = null;
            console.log(`👋 FrameSuggestModal closed for "${filename}"`);
        };
    }
    /**
     * Generate different filename variations to try
     */
    private generateFilenameVariations(filename: string): string[] {
        const variations = [
            filename,                                          // "first.excalidraw"
            filename.replace('.excalidraw', ''),               // "first"
            filename.replace('.excalidraw.md', ''),            // "first" (if they included .md)
            filename.replace('.excalidraw', '.excalidraw.md'), // "first.excalidraw.md"
        ];

        // Add .md version if not already present
        if (!filename.endsWith('.md')) {
            variations.push(filename + '.md');
        }

        // Remove duplicates and return
        return [...new Set(variations)];
    }

    /**
     * Clean partial frame input to handle different formats
     */
    private cleanPartialFrame(partialFrame: string): string {
        // Remove ^frame= prefix if present (Obsidian's block reference format)
        return partialFrame.replace(/^\^frame=/, '').replace(/^\^/,'');
    }

    destroy(): void {
        // Clean up any pending timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        // Close any open modal
        if (this.currentModal) {
            this.currentModal.close();
            this.currentModal = null;
        }
        
        console.log('🧹 ExcalinkViewPlugin destroyed');
    }
}


/**
 * Interface for wikilink match results
 */
export interface WikilinkMatch {
    startPos: number,
    endPos: number,
    fullMatch: string,
    filename: string,
    partialFrame: string,
    isComplete: boolean
}