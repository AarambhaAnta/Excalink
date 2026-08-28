import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate, ViewPlugin, PluginValue } from "@codemirror/view";
import { App } from "obsidian";
import Excalink from "../main";
import { DrawingIndexer } from "../indexer";
import { DrawingTarget } from "../excalidraw/parser";
import { DrawingSuggestModal } from "../ui/suggestModal";

const DEBOUNCE_MS = 300;

export interface WikilinkMatch {
	startPos: number;
	endPos: number;
	fullMatch: string;
	filename: string;
	partialTarget: string;
	isComplete: boolean;
}

/** Builds the CodeMirror extension that watches for `[[filename#` patterns. */
export class LinkDetector {
	constructor(private indexer: DrawingIndexer, private app: App, private plugin: Excalink) {}

	getExtension(): Extension {
		const { indexer, app, plugin } = this;
		return ViewPlugin.define((view: EditorView) => new LinkDetectorViewPlugin(view, indexer, app, plugin));
	}
}

class LinkDetectorViewPlugin implements PluginValue {
	private debounceTimer: number | null = null;
	private currentModal: DrawingSuggestModal | null = null;
	private currentView: EditorView;

	constructor(
		view: EditorView,
		private indexer: DrawingIndexer,
		private app: App,
		private plugin: Excalink,
	) {
		this.currentView = view;
	}

	update(update: ViewUpdate): void {
		this.currentView = update.view;
		if (!update.docChanged && !update.selectionSet) return;

		if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => this.checkForWikilinkPattern(update.view), DEBOUNCE_MS);
	}

	destroy(): void {
		if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
		this.currentModal?.close();
		this.currentModal = null;
	}

	private checkForWikilinkPattern(view: EditorView): void {
		if (!this.plugin.settings.enableSuggestions) return;

		const { state } = view;
		const cursor = state.selection.main.head;
		const line = state.doc.lineAt(cursor);
		const match = this.findWikilinkAtCursor(line.text, cursor - line.from);

		if (match && match.filename && match.fullMatch.includes("#")) {
			this.handleWikilinkDetection(match);
		} else if (this.currentModal) {
			this.currentModal.close();
			this.currentModal = null;
		}
	}

	/** Finds a `[[filename#partial` (or complete `[[filename#partial]]`) pattern around the cursor. */
	private findWikilinkAtCursor(lineText: string, cursorPos: number): WikilinkMatch | null {
		if (cursorPos < 0 || cursorPos > lineText.length) return null;

		let startPos = -1;
		for (let i = cursorPos - 1; i >= 0; i--) {
			if (lineText.substring(i, i + 2) === "[[") {
				startPos = i;
				break;
			}
			if (lineText[i] === "]" || lineText[i] === "\n") break;
		}
		if (startPos === -1) return null;

		let endPos = -1;
		for (let i = cursorPos; i < lineText.length - 1; i++) {
			if (lineText.substring(i, i + 2) === "]]") {
				endPos = i + 2;
				break;
			}
		}
		const isComplete = endPos !== -1;
		if (!isComplete) endPos = cursorPos;

		const contentEnd = isComplete ? endPos - 2 : endPos;
		const wikilinkContent = lineText.substring(startPos + 2, contentEnd);
		if (!wikilinkContent.trim() || !wikilinkContent.includes("#")) return null;

		const [filename, partialTarget] = wikilinkContent.split("#", 2);
		if (!filename.trim()) return null;

		return {
			startPos,
			endPos,
			fullMatch: lineText.substring(startPos, endPos),
			filename: filename.trim(),
			partialTarget: partialTarget || "",
			isComplete,
		};
	}

	private handleWikilinkDetection(match: WikilinkMatch): void {
		const { includeFrames, includeGroups } = this.plugin.settings;
		if (!includeFrames && !includeGroups) return;

		let targets: DrawingTarget[] = [];
		let matchedFilename = "";
		for (const filename of this.generateFilenameVariations(match.filename)) {
			const found = this.indexer.getTargetsForFile(filename);
			if (found.length > 0) {
				targets = found;
				matchedFilename = filename;
				break;
			}
		}
		if (targets.length === 0) return;

		targets = targets.filter(
			(t) => (t.type === "frame" && includeFrames) || (t.type === "group" && includeGroups),
		);

		const partial = this.cleanPartialTarget(match.partialTarget);
		if (partial) {
			targets = targets.filter((t) => t.name.toLowerCase().includes(partial.toLowerCase()));
		}

		if (targets.length > 0) {
			this.showSuggestModal(targets, matchedFilename, match);
		}
	}

	private showSuggestModal(targets: DrawingTarget[], filename: string, match: WikilinkMatch): void {
		this.currentModal?.close();

		const modal = new DrawingSuggestModal(
			this.app,
			targets,
			filename,
			this.plugin.settings,
			(selected) => {
				this.currentModal = null;
				this.insertTargetLink(selected, match);
			},
		);
		this.currentModal = modal;
		modal.setOnCloseCallback(() => {
			this.currentModal = null;
		});
		modal.open();

		const partial = this.cleanPartialTarget(match.partialTarget);
		if (partial) {
			window.setTimeout(() => {
				if (modal.inputEl) {
					modal.inputEl.value = partial;
					modal.inputEl.dispatchEvent(new Event("input"));
				}
			}, 10);
		}
	}

	/** Replaces the `[[filename#partial` (or `...partial]]`) text with the completed link. */
	private insertTargetLink(target: DrawingTarget, match: WikilinkMatch): void {
		const { state } = this.currentView;
		const cursor = state.selection.main.head;
		const line = state.doc.lineAt(cursor);
		const lineText = line.text;

		let replaceFrom = line.from + match.startPos;
		let replaceTo = line.from + match.endPos;

		const currentText = lineText.substring(match.startPos, match.endPos);
		if (currentText !== match.fullMatch) {
			// The line changed while the modal was open (e.g. cursor moved); re-locate the pattern.
			const newMatch = this.findWikilinkAtCursor(lineText, cursor - line.from);
			if (!newMatch || newMatch.filename !== match.filename) return;
			replaceFrom = line.from + newMatch.startPos;
			replaceTo = line.from + newMatch.endPos;
		}

		const sanitizedName = target.refValue.replace(/[[\]]/g, "").trim();
		if (!sanitizedName) return;

		const prefix = target.type === "frame" ? "frame" : "group";
		let link = `[[${match.filename}#^${prefix}=${sanitizedName}]]`;

		if (!match.isComplete && lineText.substring(match.endPos).startsWith("]]")) {
			link = `[[${match.filename}#^${prefix}=${sanitizedName}`;
		}

		this.currentView.dispatch(
			state.update({
				changes: { from: replaceFrom, to: replaceTo, insert: link },
				selection: { anchor: replaceFrom + link.length, head: replaceFrom + link.length },
			}),
		);
	}

	private generateFilenameVariations(filename: string): string[] {
		const variations = new Set([
			filename,
			filename.replace(".excalidraw", ""),
			filename.replace(".excalidraw.md", ""),
			filename.replace(".excalidraw", ".excalidraw.md"),
		]);
		if (!filename.endsWith(".md")) variations.add(`${filename}.md`);
		return [...variations];
	}

	private cleanPartialTarget(partial: string): string {
		return partial.replace(/^\^(frame|group)=/, "").replace(/^\^/, "");
	}
}
