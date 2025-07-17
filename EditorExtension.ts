import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, ViewPlugin, PluginValue } from "@codemirror/view";
import * as exp from "constants";
import { FrameIndexer } from "FrameIndexer";

/**
 * EditorExtension - Handles detection of [[filename# typing patterns
 * Integrates with CodeMirror to watch for user input and cursor postion
 */
export class EditorExtension {
    private frameIndexer: FrameIndexer;

    constructor(frameIndexer: FrameIndexer) {
        this.frameIndexer = frameIndexer;
    }

    /**
     * Creates the CodeMirror extension for editor integration
     */
    getExtension(): Extension {
        const frameIndexer = this.frameIndexer; // Capture in closure

        return ViewPlugin.define((view: EditorView) => {
            return new ExcalinkViewPlugin(view, frameIndexer);
        });
    }
}

/**
 * CodeMirror ViewPlugin that handles the actual cursor and typing detection
 */
export class ExcalinkViewPlugin implements PluginValue {
    private frameIndexer: FrameIndexer;

    constructor(view: EditorView, frameIndexer: FrameIndexer) {
        this.frameIndexer = frameIndexer;
        console.log('🎯 ExcalinkViewPlugin initialized');
    }
    /**
     * Called whenever the editor view updates (typing, cursor movement, etc.)
     */
    update(update: ViewUpdate): void {
        // Only process if there were document changes (user typed something)
        if (update.docChanged) {
            console.log('📝 Document changed - checking for [[filename# pattern...');
            this.checkForWikilinkPattern(update.view);
        }

        // Also check on selection changes (cursor movement)
        if (update.selectionSet) {
            this.checkForWikilinkPattern(update.view);
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
                this.handleWikilinkDetection(wikilinkMatch);
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

        const wikilinkContent = lineText.substring(startPos + 2, endPos - (endPos > cursorPos ? 2 : 0));

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

        // Check if we have frames for this filename
        const frames = this.frameIndexer?.getFramesForFile(match.filename);
        if (frames && frames.length > 0) {
            console.log(`    🖼️ Available frames: [${frames.map(f => f.name).join(', ')}]`);

            // Filter frames based on partial input
            if (match.partialFrame) {
                const matchingFrames = frames.filter(frame => frame.name.toLowerCase().startsWith(match.partialFrame.toLowerCase()));

                console.log(`    🎯 Matching frames: [${matchingFrames.map(f => f.name).join(', ')}]`);
            }
        } else {
            console.log(`    ❌ No frames found for file "${match.filename}"`);
        }
    }
    destroy(): void {
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