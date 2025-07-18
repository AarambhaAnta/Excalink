import { FuzzySuggestModal } from "obsidian";
import { FrameInfo } from "FrameIndexer";

/**
 * FrameSuggestModal - A fuzzy search modal for frame suggestions
 * Shows matching frame names when user types [[filename#
 */
export class FrameSuggestModal extends FuzzySuggestModal<FrameInfo> {
	private frames: FrameInfo[];
	private onSelect: (frame: FrameInfo) => void;
	private filename: string;

	constructor(
		app: any,
		frames: FrameInfo[],
		filename: string,
		onSelect: (frame: FrameInfo) => void,
	) {
		super(app);
		this.frames = frames;
		this.filename = filename;
		this.onSelect = onSelect;

		console.log(
			`🎯 FrameSuggestModal created for "${filename}" with ${frames.length} frames`,
		);

		// Set modal properties
		this.setPlaceholder(`Search frames in ${filename}...`);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to select" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	/**
	 * Get all items to search through (required by FuzzySuggestModal)
	 */
	getItems(): FrameInfo[] {
		return this.frames;
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
		console.log(`✅ User selected frame: "${frame.name}" (${frame.id})`);
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

		// Add frame icon
		const iconEl = el.createDiv({ cls: "excalink-suggestion-icon" });
		iconEl.innerHTML = "🖼️";

		// Create content container
		const contentEl = el.createDiv({ cls: "excalink-suggestion-content" });

		// Frame name (main text) with highlighting
		const nameEl = contentEl.createDiv({
			cls: "excalink-suggestion-title",
		});
		this.renderMatchedText(nameEl, frame.name, match.matches);

		// File info (subtitle)
		const fileEl = contentEl.createDiv({
			cls: "excalink-suggestion-note",
			text: `in ${this.filename}`,
		});

		console.log(`🎨 Rendered suggestion for frame: "${frame.name}"`);
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

		// Add custom CSS class for styling
		this.modalEl.addClass("excalink-modal");

		console.log(`🚀 FrameSuggestModal opened for "${this.filename}"`);
	}

	/**
	 * Called when modal is closed
	 */
	onClose(): void {
		super.onClose();
		console.log(`👋 FrameSuggestModal closed for "${this.filename}"`);
	}
}
