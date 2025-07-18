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
    private currentView: EditorView | null = null;
    private currentMatch: WikilinkMatch | null = null;

    constructor(view: EditorView, frameIndexer: FrameIndexer, app: App) {
        this.frameIndexer = frameIndexer;
        this.app = app;
        this.currentView = view;
        console.log('🎯 ExcalinkViewPlugin initialized');
    }
    /**
     * Called whenever the editor view updates (typing, cursor movement, etc.)
     */
    update(update: ViewUpdate): void {
        // Update our view reference
        this.currentView = update.view;
        
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
        
        // Store current match for text replacement
        this.currentMatch = match;
        
        const modal = new FrameSuggestModal(
            this.app,
            frames,
            filename,
            (selectedFrame) => {
                console.log(`✅ Frame selected: "${selectedFrame.name}"`);
                this.currentModal = null;
                
                // Replace the text in the editor with the complete frame link
                this.insertFrameLink(selectedFrame, filename, match);
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
            this.currentMatch = null;
            console.log(`👋 FrameSuggestModal closed for "${filename}"`);
        };
    }

    /**
     * Insert the selected frame link into the editor
     * 
     * Day 4 Implementation:
     * - Replaces [[filename# or [[filename#partial with [[filename#^frame=selectedFrame]]
     * - Uses Obsidian's block reference format: #^frame=frameName
     * - Handles incomplete links (missing closing ]])
     * - Validates text hasn't changed during modal interaction
     * - Preserves cursor position after insertion
     * - Handles edge cases gracefully
     */
    private insertFrameLink(selectedFrame: any, filename: string, match: WikilinkMatch): void {
        if (!this.currentView) {
            console.error('❌ No current view available for text insertion');
            return;
        }

        try {
            console.log(`🔧 Inserting frame link: "${filename}#^frame=${selectedFrame.name}"`);
            
            // Get current state
            const { state } = this.currentView;
            const cursor = state.selection.main.head;
            const line = state.doc.lineAt(cursor);
            const lineText = line.text;
            const lineStart = line.from;
            
            // Calculate absolute positions for the replacement
            let replaceFrom = lineStart + match.startPos;
            let replaceTo = lineStart + match.endPos;
            
            // Validate that the text is still as expected (handle edge cases)
            const currentText = lineText.substring(match.startPos, match.endPos);
            console.log(`🔍 Current text at position: "${currentText}"`);
            console.log(`🔍 Expected text: "${match.fullMatch}"`);
            
            // If the text has changed, try to find the wikilink pattern again
            if (currentText !== match.fullMatch) {
                console.log('⚠️ Text has changed, attempting to find current pattern...');
                const cursorInLine = cursor - lineStart;
                const newMatch = this.findWikilinkAtCursor(lineText, cursorInLine);
                
                if (newMatch && newMatch.filename === match.filename) {
                    console.log('✅ Found updated pattern, using new positions');
                    replaceFrom = lineStart + newMatch.startPos;
                    replaceTo = lineStart + newMatch.endPos;
                } else {
                    console.error('❌ Could not find valid wikilink pattern, aborting insertion');
                    return;
                }
            }
            
            // Create the complete frame link with Obsidian block reference format
            // Use the original filename from the match to preserve user's input format
            const originalFilename = match.filename;
            const frameLink = `[[${originalFilename}#^frame=${selectedFrame.name}]]`;
            
            // Check if the link is incomplete (no closing ]])
            const isIncomplete = !match.isComplete;
            let finalFrameLink = frameLink;
            
            if (isIncomplete) {
                console.log('🔧 Detected incomplete link, will complete it');
                // For incomplete links, we might need to add the closing ]]
                const currentLineText = lineText;
                const afterCursor = currentLineText.substring(match.endPos);
                
                // If there are already ]] after the cursor, don't add them
                if (afterCursor.startsWith(']]')) {
                    finalFrameLink = `[[${originalFilename}#^frame=${selectedFrame.name}`;
                    console.log('🔧 Found existing ]], will not duplicate');
                }
            }
            
            console.log(`📝 Replacing text from ${replaceFrom} to ${replaceTo} with: "${finalFrameLink}"`);
            console.log(`🎯 Original filename preserved: "${originalFilename}"`);
            console.log(`🔗 Using Obsidian block reference format: ^frame=${selectedFrame.name}`);
            
            // Perform the text replacement
            const transaction = state.update({
                changes: {
                    from: replaceFrom,
                    to: replaceTo,
                    insert: finalFrameLink
                },
                selection: {
                    anchor: replaceFrom + finalFrameLink.length,
                    head: replaceFrom + finalFrameLink.length
                }
            });
            
            // Apply the transaction
            this.currentView.dispatch(transaction);
            
            console.log(`✅ Successfully inserted frame link: "${finalFrameLink}"`);
            console.log(`🎯 Cursor positioned at: ${replaceFrom + finalFrameLink.length}`);
            
        } catch (error) {
            console.error('❌ Error inserting frame link:', error);
        }
    }

    /**
     * Test method to verify text replacement logic (for debugging)
     */
    public testTextReplacement(): void {
        console.log('🧪 Testing text replacement logic...');
        
        // Sample test data
        const testMatch: WikilinkMatch = {
            startPos: 5,
            endPos: 15,
            fullMatch: '[[test#fra',
            filename: 'test',
            partialFrame: 'fra',
            isComplete: false
        };
        
        const testFrame = {
            name: 'test-frame',
            id: 'test-id'
        };
        
        console.log('📝 Test match:', testMatch);
        console.log('🖼️ Test frame:', testFrame);
        console.log('🔗 Expected output format: [[test#^frame=test-frame]]');
        
        // This would be called in a real scenario
        // this.insertFrameLink(testFrame, 'test', testMatch);
        
        console.log('✅ Text replacement test completed');
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
        
        // Clear references
        this.currentView = null;
        this.currentMatch = null;
        
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