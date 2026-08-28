import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";
import { DrawingTarget } from "../excalidraw/parser";
import { ExcalinkSettings } from "../settings";
import { renderThumbnail } from "./thumbnail";

const TYPE_ICON: Record<DrawingTarget["type"], string> = {
	frame: "🖼️",
	group: "🧩",
};

/** Fuzzy-search picker for the Frames and Groups found in one Excalidraw file. */
export class DrawingSuggestModal extends FuzzySuggestModal<DrawingTarget> {
	private onCloseCallback?: () => void;

	constructor(
		app: App,
		private targets: DrawingTarget[],
		private filename: string,
		private settings: ExcalinkSettings,
		private onSelect: (target: DrawingTarget) => void,
	) {
		super(app);
		this.setPlaceholder(`Search drawings in ${filename}...`);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to select" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	setOnCloseCallback(callback: () => void): void {
		this.onCloseCallback = callback;
	}

	getItems(): DrawingTarget[] {
		const sorted = [...this.targets].sort((a, b) => {
			const byUpdated = (a.updated ?? -1) - (b.updated ?? -1);
			const cmp = byUpdated !== 0 ? byUpdated : a.index - b.index;
			return this.settings.showRecentFirst ? -cmp : cmp;
		});
		return sorted.slice(0, this.settings.maxSuggestions);
	}

	getItemText(target: DrawingTarget): string {
		return target.name;
	}

	onChooseItem(target: DrawingTarget): void {
		this.onSelect(target);
	}

	renderSuggestion(value: FuzzyMatch<DrawingTarget>, el: HTMLElement): void {
		const { item: target, match } = value;

		el.empty();
		el.addClass("excalink-suggestion");

		const iconEl = el.createDiv({ cls: "excalink-suggestion-icon" });
		if (!renderThumbnail(iconEl, target.elements)) {
			iconEl.addClass("excalink-suggestion-icon-fallback");
			iconEl.textContent = TYPE_ICON[target.type];
		}

		const contentEl = el.createDiv({ cls: "excalink-suggestion-content" });
		const nameEl = contentEl.createDiv({ cls: "excalink-suggestion-title" });
		this.renderMatchedText(nameEl, target.name, match.matches);

		if (this.settings.showFileContext) {
			contentEl.createDiv({
				cls: "excalink-suggestion-note",
				text: `${target.type} in ${this.filename}`,
			});
		}
	}

	private renderMatchedText(el: HTMLElement, text: string, matches: number[][]): void {
		el.empty();
		let lastIndex = 0;

		for (const [start, end] of [...matches].sort((a, b) => a[0] - b[0])) {
			if (lastIndex < start) el.appendText(text.slice(lastIndex, start));
			el.createSpan({ cls: "suggestion-flair", text: text.slice(start, end) });
			lastIndex = end;
		}
		if (lastIndex < text.length) el.appendText(text.slice(lastIndex));
	}

	getEmptyText(): string {
		return `No drawings found in ${this.filename}`;
	}

	onOpen(): void {
		super.onOpen();
		this.titleEl.setText(`Drawings in ${this.filename}`);
		this.modalEl.addClass("excalink-modal");
	}

	onClose(): void {
		this.onCloseCallback?.();
		super.onClose();
	}
}
