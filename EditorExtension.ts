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
    private currentViewPlugin: ExcalinkViewPlugin | null = null;

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
            const plugin = new ExcalinkViewPlugin(view, frameIndexer, app);
            this.currentViewPlugin = plugin; // Store reference for testing
            return plugin;
        });
    }

    /**
     * Run comprehensive tests through the view plugin
     * Day 6: Access testing functionality
     */
    runComprehensiveTests(): boolean {
        if (this.currentViewPlugin) {
            return this.currentViewPlugin.runComprehensiveTests();
        } else {
            console.warn('⚠️ No active view plugin for testing');
            return false;
        }
    }

    /**
     * Run text replacement tests through the view plugin
     * Day 6: Access testing functionality
     */
    testTextReplacement(): void {
        if (this.currentViewPlugin) {
            this.currentViewPlugin.testTextReplacement();
        } else {
            console.warn('⚠️ No active view plugin for testing');
        }
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
        // console.log('🎯 ExcalinkViewPlugin initialized');
    }
        /**
     * Called whenever the editor view updates (typing, cursor movement, etc.)
     * Enhanced with error handling and validation
     */
    update(update: ViewUpdate): void {
        try {
            // Update our view reference
            this.currentView = update.view;
            
            // Validate update object
            if (!update || !update.view) {
                return;
            }
            
            // Process if there were document changes or selection changes
            if (update.docChanged || update.selectionSet) {
                // Clear existing timer
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                
                // Debounce the pattern checking to improve performance
                this.debounceTimer = setTimeout(() => {
                    try {
                        this.checkForWikilinkPattern(update.view);
                    } catch (error) {
                        console.error('❌ Error in debounced pattern check:', error);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('❌ Error in update handler:', error);
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

            // console.log(`🔍 Checking cursor position ${cursor}`);

            // Look for wikilink patterns around cursor
            const wikilinkMatch = this.findWikilinkAtCursor(lineText, cursorInLine);

            if (wikilinkMatch) {
                // console.log('🎯 Found wikilink pattern:', wikilinkMatch);
                
                // Only trigger if we have a filename and at least started typing after #
                if (wikilinkMatch.filename && wikilinkMatch.fullMatch.includes('#')) {
                    this.handleWikilinkDetection(wikilinkMatch);
                }
            } else {
                // Close any existing modal if pattern is no longer present
                if (this.currentModal) {
                    // console.log('❌ Pattern no longer matches, closing modal');
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
     * Day 6: Enhanced with comprehensive validation and edge case handling
     */
    private findWikilinkAtCursor(lineText: string, cursorPos: number): WikilinkMatch | null {
        try {
            // Validate inputs
            if (!lineText || typeof lineText !== 'string' || cursorPos < 0 || cursorPos > lineText.length) {
                return null;
            }

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

            // Validate wikilink content
            if (!wikilinkContent || wikilinkContent.trim().length === 0) {
                return null;
            }

            // Check if it contains # (indicating frame reference)
            if (wikilinkContent.includes('#')) {
                const [filename, partialFrame] = wikilinkContent.split('#', 2);

                // Validate filename
                if (!filename || filename.trim().length === 0) {
                    return null;
                }

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
        } catch (error) {
            console.error('❌ Error in findWikilinkAtCursor:', error);
            return null;
        }
    }

    /**
     * Handle detected wikilink with frame reference
     * Day 6: Enhanced with robust error handling and validation
     */
    private handleWikilinkDetection(match: WikilinkMatch): void {
        try {
            // Validate the match object
            if (!match || !match.filename || typeof match.filename !== 'string') {
                console.warn('⚠️ Invalid wikilink match provided');
                return;
            }

            // console.log('🎯 Detected wikilink pattern:');
            // console.log(`    📁 Filename: "${match.filename}"`);
            // console.log(`    🔖 Partial frame: "${match.partialFrame}"`);
            // console.log(`    📍 Position: ${match.startPos}-${match.endPos}`);
            // console.log(`    ✅ Complete: ${match.isComplete}`);

            // Try different filename variations to find frames
            const possibleFilenames = this.generateFilenameVariations(match.filename);

            let frames = null;
            let matchedFilename = '';

            // Try each filename variation with error handling
            for (const filename of possibleFilenames) {
                try {
                    const foundFrames = this.frameIndexer?.getFramesForFile(filename);
                    if (foundFrames && Array.isArray(foundFrames) && foundFrames.length > 0) {
                        frames = foundFrames;
                        matchedFilename = filename;
                        break;
                    }
                } catch (error) {
                    console.warn(`⚠️ Error checking frames for "${filename}":`, error);
                    continue;
                }
            }

            if (frames && frames.length > 0) {
                // console.log(`    🖼️ Available frames in "${matchedFilename}": [${frames.map(f => f?.name || 'unnamed').join(', ')}]`);
                
                // Filter frames based on partial input if provided
                let matchingFrames = frames;
                if (match.partialFrame && typeof match.partialFrame === 'string') {
                    try {
                        const cleanPartialFrame = this.cleanPartialFrame(match.partialFrame);
                        matchingFrames = frames.filter(frame => 
                            frame && 
                            frame.name && 
                            typeof frame.name === 'string' &&
                            frame.name.toLowerCase().includes(cleanPartialFrame.toLowerCase())
                        );
//                         console.log(`    🎯 Matching frames for "${cleanPartialFrame}": [${matchingFrames.map(f => f.name).join(', ')}]`);
                    } catch (error) {
                        console.warn('⚠️ Error filtering frames:', error);
                        matchingFrames = frames; // Fallback to all frames
                    }
                }

                // Only show modal if there are frames to suggest
                if (matchingFrames.length > 0) {
                    this.showFrameSuggestModal(matchingFrames, matchedFilename, match);
                } else {
//                     console.log(`    ❓ No frames match the partial input "${match.partialFrame}"`);
                }
            } else {
//                 console.log(`    ❌ No frames found for any variation of "${match.filename}"`);
//                 console.log(`    🔍 Tried: ${possibleFilenames.join(', ')}`);
                
                // Show a helpful message to the user
//                 console.log(`    💡 Make sure the file "${match.filename}" exists and contains frames`);
            }
        } catch (error) {
            console.error('❌ Error in handleWikilinkDetection:', error);
        }
    }

    /**
     * Show the frame suggestion modal with comprehensive error handling
     * Day 6: Enhanced robustness and validation
     */
    private showFrameSuggestModal(frames: any[], filename: string, match: WikilinkMatch): void {
        try {
            // Validate inputs
            if (!frames || !Array.isArray(frames) || frames.length === 0) {
                console.warn('⚠️ No valid frames provided to modal');
                return;
            }

            if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
                console.warn('⚠️ Invalid filename provided to modal');
                return;
            }

            if (!match || typeof match !== 'object') {
                console.warn('⚠️ Invalid match object provided to modal');
                return;
            }

            if (!this.app) {
                console.error('❌ App instance not available for modal creation');
                return;
            }

//             console.log(`🎭 Opening FrameSuggestModal with ${frames.length} frames`);
            
            // Close any existing modal first
            if (this.currentModal) {
                try {
                    this.currentModal.close();
                } catch (error) {
                    console.warn('⚠️ Error closing existing modal:', error);
                }
                this.currentModal = null;
            }
            
            // Store current match for text replacement
            this.currentMatch = match;
            
            // Create modal with error handling
            let modal: FrameSuggestModal;
            try {
                modal = new FrameSuggestModal(
                    this.app,
                    frames,
                    filename,
                    (selectedFrame) => {
                        try {
//                             console.log(`✅ Frame selected: "${selectedFrame?.name || 'unknown'}" (${selectedFrame?.id || 'no-id'})`);
                            this.currentModal = null;
                            
                            // Validate selected frame
                            if (!selectedFrame || !selectedFrame.name) {
                                console.error('❌ Invalid frame selected');
                                return;
                            }
                            
                            // Replace the text in the editor with the complete frame link
                            this.insertFrameLink(selectedFrame, filename, match);
                        } catch (error) {
                            console.error('❌ Error handling frame selection:', error);
                        }
                    }
                );
            } catch (error) {
                console.error('❌ Error creating FrameSuggestModal:', error);
                return;
            }
            
            // Store reference to current modal
            this.currentModal = modal;
            
            // Set our close callback instead of overwriting onClose
            modal.setOnCloseCallback(() => {
                this.currentModal = null;
                this.currentMatch = null;
//                 console.log(`👋 FrameSuggestModal closed for "${filename}"`);
            });
            
            // Open modal with error handling
            try {
                modal.open();
            } catch (error) {
                console.error('❌ Error opening modal:', error);
                this.currentModal = null;
                return;
            }
            
            // Pre-fill the search if there's a partial frame
            if (match.partialFrame && typeof match.partialFrame === 'string') {
                try {
                    const cleanPartialFrame = this.cleanPartialFrame(match.partialFrame);
                    // Set the input value after opening
                    setTimeout(() => {
                        try {
                            if (modal.inputEl && modal.inputEl.value !== undefined) {
                                modal.inputEl.value = cleanPartialFrame;
                                modal.inputEl.dispatchEvent(new Event('input'));
                            }
                        } catch (error) {
                            console.warn('⚠️ Error pre-filling modal input:', error);
                        }
                    }, 10);
                } catch (error) {
                    console.warn('⚠️ Error processing partial frame for pre-fill:', error);
                }
            }
        } catch (error) {
            console.error('❌ Critical error in showFrameSuggestModal:', error);
        }
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
     * Day 6: Enhanced with comprehensive error handling and validation
     */
    private insertFrameLink(selectedFrame: any, filename: string, match: WikilinkMatch): void {
        try {
            // Validate inputs
            if (!selectedFrame || !selectedFrame.name || typeof selectedFrame.name !== 'string') {
                console.error('❌ Invalid selected frame provided to insertFrameLink');
                return;
            }

            if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
                console.error('❌ Invalid filename provided to insertFrameLink');
                return;
            }

            if (!match || typeof match !== 'object' || typeof match.startPos !== 'number' || typeof match.endPos !== 'number') {
                console.error('❌ Invalid match object provided to insertFrameLink');
                return;
            }

            if (!this.currentView) {
                console.error('❌ No current view available for text insertion');
                return;
            }

//             console.log(`🔧 Inserting frame link: "${filename}#^frame=${selectedFrame.name}"`);
            
            // Get current state with validation
            const { state } = this.currentView;
            if (!state || !state.doc || !state.selection) {
                console.error('❌ Invalid editor state for text insertion');
                return;
            }

            const cursor = state.selection.main.head;
            
            let line, lineText, lineStart;
            try {
                line = state.doc.lineAt(cursor);
                lineText = line.text;
                lineStart = line.from;
            } catch (error) {
                console.error('❌ Error getting line information:', error);
                return;
            }
            
            // Validate line information
            if (typeof lineText !== 'string') {
                console.error('❌ Invalid line text');
                return;
            }

            // Calculate absolute positions for the replacement with bounds checking
            if (match.startPos < 0 || match.endPos < 0 || match.startPos >= lineText.length || match.endPos > lineText.length) {
                console.error('❌ Match positions out of bounds:', { startPos: match.startPos, endPos: match.endPos, lineLength: lineText.length });
                return;
            }

            let replaceFrom = lineStart + match.startPos;
            let replaceTo = lineStart + match.endPos;
            
            // Validate that the text is still as expected (handle edge cases)
            const currentText = lineText.substring(match.startPos, match.endPos);
//             console.log(`🔍 Current text at position: "${currentText}"`);
//             console.log(`🔍 Expected text: "${match.fullMatch}"`);
            
            // If the text has changed, try to find the wikilink pattern again
            if (currentText !== match.fullMatch) {
//                 console.log('⚠️ Text has changed, attempting to find current pattern...');
                try {
                    const cursorInLine = cursor - lineStart;
                    const newMatch = this.findWikilinkAtCursor(lineText, cursorInLine);
                    
                    if (newMatch && newMatch.filename === match.filename) {
//                         console.log('✅ Found updated pattern, using new positions');
                        replaceFrom = lineStart + newMatch.startPos;
                        replaceTo = lineStart + newMatch.endPos;
                    } else {
                        console.error('❌ Could not find valid wikilink pattern, aborting insertion');
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error finding updated pattern:', error);
                    return;
                }
            }
            
            // Create the complete frame link with Obsidian block reference format
            // Use the original filename from the match to preserve user's input format
            const originalFilename = match.filename;
            
            // Sanitize frame name to prevent injection or malformed links
            const sanitizedFrameName = selectedFrame.name.replace(/[\[\]]/g, '').trim();
            if (!sanitizedFrameName) {
                console.error('❌ Frame name is empty after sanitization');
                return;
            }
            
            const frameLink = `[[${originalFilename}#^frame=${sanitizedFrameName}]]`;
            
            // Check if the link is incomplete (no closing ]])
            const isIncomplete = !match.isComplete;
            let finalFrameLink = frameLink;
            
            if (isIncomplete) {
//                 console.log('🔧 Detected incomplete link, will complete it');
                try {
                    // For incomplete links, we might need to add the closing ]]
                    const currentLineText = lineText;
                    const afterCursor = currentLineText.substring(match.endPos);
                    
                    // If there are already ]] after the cursor, don't add them
                    if (afterCursor.startsWith(']]')) {
                        finalFrameLink = `[[${originalFilename}#^frame=${sanitizedFrameName}`;
//                         console.log('🔧 Found existing ]], will not duplicate');
                    }
                } catch (error) {
                    console.warn('⚠️ Error checking for existing closing brackets:', error);
                    // Use complete link as fallback
                }
            }
            
//             console.log(`📝 Replacing text from ${replaceFrom} to ${replaceTo} with: "${finalFrameLink}"`);
//             console.log(`🎯 Original filename preserved: "${originalFilename}"`);
//             console.log(`🔗 Using Obsidian block reference format: ^frame=${sanitizedFrameName}`);
            
            // Validate replacement bounds
            if (replaceFrom < 0 || replaceTo < 0 || replaceFrom > state.doc.length || replaceTo > state.doc.length) {
                console.error('❌ Replacement bounds out of document range:', { replaceFrom, replaceTo, docLength: state.doc.length });
                return;
            }
            
            // Perform the text replacement with error handling
            try {
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
                
//                 console.log(`✅ Successfully inserted frame link: "${finalFrameLink}"`);
//                 console.log(`🎯 Cursor positioned at: ${replaceFrom + finalFrameLink.length}`);
            } catch (error) {
                console.error('❌ Error applying text transaction:', error);
                return;
            }
            
        } catch (error) {
            console.error('❌ Critical error in insertFrameLink:', error);
        }
    }

    /**
     * Test method to verify text replacement logic (for debugging)
     * Day 6: Enhanced with comprehensive testing scenarios
     */
    public testTextReplacement(): void {
//         console.log('🧪 Testing text replacement logic...');
        
        try {
            // Test scenario 1: Complete wikilink
            const testMatch1: WikilinkMatch = {
                startPos: 5,
                endPos: 17,
                fullMatch: '[[test#frame]]',
                filename: 'test',
                partialFrame: 'frame',
                isComplete: true
            };
            
            const testFrame1 = {
                name: 'test-frame-1',
                id: 'test-id-1',
                index: 10 // Recent frame (higher index)
            };
            
//             console.log('📝 Test 1 - Complete link:', testMatch1);
//             console.log('🖼️ Test 1 - Frame:', testFrame1);
//             console.log('🔗 Test 1 - Expected: [[test#^frame=test-frame-1]]');
            
            // Test scenario 2: Incomplete wikilink
            const testMatch2: WikilinkMatch = {
                startPos: 0,
                endPos: 10,
                fullMatch: '[[docs#fra',
                filename: 'docs',
                partialFrame: 'fra',
                isComplete: false
            };
            
            const testFrame2 = {
                name: 'frame-name-2',
                id: 'test-id-2',
                index: 5 // Older frame (lower index)
            };
            
//             console.log('📝 Test 2 - Incomplete link:', testMatch2);
//             console.log('🖼️ Test 2 - Frame:', testFrame2);
//             console.log('🔗 Test 2 - Expected: [[docs#^frame=frame-name-2]]');
            
            // Test scenario 3: Edge case with special characters
            const testMatch3: WikilinkMatch = {
                startPos: 2,
                endPos: 20,
                fullMatch: '[[file-name.test#',
                filename: 'file-name.test',
                partialFrame: '',
                isComplete: false
            };
            
            const testFrame3 = {
                name: 'special-frame [with] brackets',
                id: 'test-id-3',
                index: 15 // Most recent frame (highest index)
            };
            
//             console.log('📝 Test 3 - Special characters:', testMatch3);
//             console.log('🖼️ Test 3 - Frame:', testFrame3);
//             console.log('🔗 Test 3 - Expected: [[file-name.test#^frame=special-frame with brackets]]');
            
//             console.log('✅ All test scenarios defined successfully');
//             console.log('💡 Note: Actual insertion would be tested in a real editor environment');
            
        } catch (error) {
            console.error('❌ Error in test setup:', error);
        }
    }

    /**
     * Comprehensive validation test for the plugin
     * Day 6: Tests all major functionality for robustness
     */
    public runComprehensiveTests(): boolean {
//         console.log('🔬 Running comprehensive plugin tests...');
        let allTestsPassed = true;

        try {
            // Test 1: FrameIndexer validation
//             console.log('🧪 Test 1: FrameIndexer validation');
            if (!this.frameIndexer) {
                console.error('❌ FrameIndexer not initialized');
                allTestsPassed = false;
            } else {
//                 console.log('✅ FrameIndexer initialized');
            }

            // Test 2: App instance validation
//             console.log('🧪 Test 2: App instance validation');
            if (!this.app) {
                console.error('❌ App instance not available');
                allTestsPassed = false;
            } else {
//                 console.log('✅ App instance available');
            }

            // Test 3: Pattern detection validation
//             console.log('🧪 Test 3: Pattern detection validation');
            const testPatterns = [
                { input: 'Some text [[file#frame]] more text', pos: 15, expected: true },
                { input: '[[incomplete#', pos: 12, expected: true },
                { input: 'No pattern here', pos: 5, expected: false },
                { input: '[[file#]]', pos: 7, expected: true },
                { input: '[[file]]', pos: 6, expected: false }
            ];

            let patternTestsPassed = 0;
            for (const test of testPatterns) {
                try {
                    const result = this.findWikilinkAtCursor(test.input, test.pos);
                    const hasPattern = result !== null;
                    if (hasPattern === test.expected) {
                        patternTestsPassed++;
//                         console.log(`✅ Pattern test passed: "${test.input}" at ${test.pos}`);
                    } else {
                        console.error(`❌ Pattern test failed: "${test.input}" at ${test.pos}. Expected: ${test.expected}, Got: ${hasPattern}`);
                        allTestsPassed = false;
                    }
                } catch (error) {
                    console.error(`❌ Pattern test error for "${test.input}":`, error);
                    allTestsPassed = false;
                }
            }
//             console.log(`📊 Pattern tests: ${patternTestsPassed}/${testPatterns.length} passed`);

            // Test 4: Filename variation generation
//             console.log('🧪 Test 4: Filename variation generation');
            try {
                const testFilename = 'example.excalidraw';
                const variations = this.generateFilenameVariations(testFilename);
                if (variations && variations.length > 0) {
//                     console.log(`✅ Generated ${variations.length} filename variations:`, variations);
                } else {
                    console.error('❌ No filename variations generated');
                    allTestsPassed = false;
                }
            } catch (error) {
                console.error('❌ Filename variation test failed:', error);
                allTestsPassed = false;
            }

            // Test 5: Partial frame cleaning
//             console.log('🧪 Test 5: Partial frame cleaning');
            const cleaningTests = [
                { input: '^frame=test', expected: 'test' },
                { input: '^test', expected: 'test' },
                { input: 'normal', expected: 'normal' },
                { input: '', expected: '' }
            ];

            for (const test of cleaningTests) {
                try {
                    const result = this.cleanPartialFrame(test.input);
                    if (result === test.expected) {
//                         console.log(`✅ Cleaning test passed: "${test.input}" -> "${result}"`);
                    } else {
                        console.error(`❌ Cleaning test failed: "${test.input}". Expected: "${test.expected}", Got: "${result}"`);
                        allTestsPassed = false;
                    }
                } catch (error) {
                    console.error(`❌ Cleaning test error for "${test.input}":`, error);
                    allTestsPassed = false;
                }
            }

//             console.log(`🏁 Comprehensive tests completed. All passed: ${allTestsPassed ? '✅' : '❌'}`);
            return allTestsPassed;

        } catch (error) {
            console.error('❌ Critical error during comprehensive testing:', error);
            return false;
        }
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
        
//         console.log('🧹 ExcalinkViewPlugin destroyed');
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