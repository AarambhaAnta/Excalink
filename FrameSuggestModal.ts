import { FuzzySuggestModal, App } from "obsidian";
import { FrameInfo } from "FrameIndexer";
import { ExcalinkSettings } from "settings";

/**
 * FrameSuggestModal - A fuzzy search modal for frame suggestions
 * Shows matching frame names when user types [[filename#
 * Day 7: Enhanced with settings integration
 */
export class FrameSuggestModal extends FuzzySuggestModal<FrameInfo> {
	private frames: FrameInfo[];
	private onSelect: (frame: FrameInfo) => void;
	private filename: string;
	private onCloseCallback?: () => void;
	private settings: ExcalinkSettings;

	constructor(
		app: App,
		frames: FrameInfo[],
		filename: string,
		onSelect: (frame: FrameInfo) => void,
		settings: ExcalinkSettings
	) {
		super(app);
		this.frames = frames;
		this.filename = filename;
		this.onSelect = onSelect;
		this.settings = settings;

		if (this.settings.enableDebugLogging) {
			console.log(
				`🎯 FrameSuggestModal created for "${filename}" with ${frames.length} frames`,
			);
		}

		// Set modal properties
		this.setPlaceholder(`Search frames in ${filename}...`);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to select" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	/**
	 * Set a callback to be called when the modal closes
	 */
	setOnCloseCallback(callback: () => void): void {
		this.onCloseCallback = callback;
	}

	/**
	 * Get all items to search through (required by FuzzySuggestModal)
	 * Returns frames in reverse order of creation (newest first) with limit
	 */
	getItems(): FrameInfo[] {
		// Sort frames by index order based on settings
		let sortedFrames = [...this.frames];
		
		if (this.settings.showRecentFramesFirst) {
			// Sort by index in descending order (newest/highest index first)
			sortedFrames.sort((a, b) => b.index - a.index);
		} else {
			// Sort by index in ascending order (oldest first)
			sortedFrames.sort((a, b) => a.index - b.index);
		}
		
		// Limit the number of suggestions displayed
		return sortedFrames.slice(0, this.settings.maxSuggestionsDisplayed);
	}

	/**
	 * Get the display text for each item (required by FuzzySuggestModal)
	 */
	getItemText(frame: FrameInfo): string {
		return frame.name;
	}

	/**
	 * Called when user selects an item (required by FuzzySuggestModal)
	 */
	onChooseItem(frame: FrameInfo): void {
		if (this.settings.enableDebugLogging) {
			console.log(`✅ User selected frame: "${frame.name}" (${frame.id})`);
		}
		this.onSelect(frame);
		this.close();
	}

	/**
	 * Render each suggestion item with custom styling
	 */
	renderSuggestion(value: any, el: HTMLElement): void {
		const frame = value.item as FrameInfo;
		const match = value.match;

		// Clear the element
		el.empty();
		el.addClass("excalink-suggestion");

		// Add frame icon (based on settings)
		if (this.settings.showFrameIcons) {
			const iconEl = el.createDiv({ cls: "excalink-suggestion-icon" });
			iconEl.innerHTML = "🖼️";
		}

		// Create content container
		const contentEl = el.createDiv({ cls: "excalink-suggestion-content" });

		// Frame name (main text) with highlighting
		const nameEl = contentEl.createDiv({
			cls: "excalink-suggestion-title",
		});
		this.renderMatchedText(nameEl, frame.name, match.matches);

		// File info (subtitle) - based on settings
		if (this.settings.showFileContext) {
			const fileEl = contentEl.createDiv({
				cls: "excalink-suggestion-note",
				text: `in ${this.filename}`,
			});
		}

		if (this.settings.enableDebugLogging) {
			console.log(`🎨 Rendered suggestion for frame: "${frame.name}"`);
		}
	}

	/**
	 * Render text with highlighted matches
	 */
	private renderMatchedText(
		el: HTMLElement,
		text: string,
		matches: number[][],
	): void {
		el.empty();

		let lastIndex = 0;

		// Sort matches by start position
		const sortedMatches = matches.sort((a, b) => a[0] - b[0]);

		sortedMatches.forEach(([start, end]) => {
			// Add text before match
			if (lastIndex < start) {
				el.appendText(text.slice(lastIndex, start));
			}

			// Add highlighted match
			const matchEl = el.createSpan({ cls: "suggestion-flair" });
			matchEl.textContent = text.slice(start, end);

			lastIndex = end;
		});

		// Add remaining text
		if (lastIndex < text.length) {
			el.appendText(text.slice(lastIndex));
		}
	}

	/**
	 * Set placeholder text for the search input
	 */
	getEmptyText(): string {
		return `No frames found in ${this.filename}`;
	}

	/**
	 * Called when modal is opened
	 */
	onOpen(): void {
		super.onOpen();

		// Set modal title
		if (this.titleEl) {
			this.titleEl.setText(`Frames in ${this.filename}`);
		}

		// Add custom CSS class for styling based on theme setting
		this.modalEl.addClass("excalink-modal");
		if (this.settings.modalTheme === 'minimal') {
			this.modalEl.addClass("excalink-modal-minimal");
		}

		if (this.settings.enableDebugLogging) {
			console.log(`🚀 FrameSuggestModal opened for "${this.filename}"`);
		}
	}

	/**
	 * Called when modal is closed - properly extends parent cleanup
	 * Day 7: Enhanced with settings integration
	 */
	onClose(): void {
		if (this.settings.enableDebugLogging) {
			console.log(`👋 FrameSuggestModal closing for "${this.filename}"`);
		}
		
		try {
			// Call our custom callback first
			if (this.onCloseCallback) {
				try {
					this.onCloseCallback();
				} catch (error) {
					console.error('❌ Error in onClose callback:', error);
					// Don't let callback errors prevent modal cleanup
				}
			}
		} catch (error) {
			console.error('❌ Unexpected error in modal close handling:', error);
		} finally {
			// Always call parent's onClose to ensure proper cleanup
			try {
				super.onClose();
			} catch (error) {
				console.error('❌ Error in parent onClose:', error);
			}
		}
	}
}
