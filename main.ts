import { Plugin, TFile } from "obsidian";
import { FrameIndexer } from "FrameIndexer";
import { EditorExtension } from "EditorExtension";

export default class Excalink extends Plugin{
	private frameIndexer: FrameIndexer;
	private editorExtension: EditorExtension;

	async onload(): Promise<void> {
		console.log('🚀 Excalink plugin loading...');

		// Initialize frame indexer (Day 1)
		this.frameIndexer = new FrameIndexer(this.app.vault);
		await this.frameIndexer.scanAllExcalidrawFiles();

		// Initialize editor extension (Day 2)
		console.log('🎯 Setting up editor extension...');
		this.editorExtension = new EditorExtension(this.frameIndexer, this.app);
		this.registerEditorExtension(this.editorExtension.getExtension());

		// Day 5: Register file change event listeners for caching
		console.log('📡 Setting up file change listeners...');
		this.setupFileChangeListeners();

		// Add debug command for cache statistics
		this.addCommand({
			id: 'show-cache-stats',
			name: 'Show Cache Statistics',
			callback: () => {
				const stats = this.frameIndexer.getCacheStats();
				console.log('📊 Cache Statistics:', stats);
				// You could also show this in a notice or modal
			}
		});

		console.log('✅ Excalink plugin loaded with caching and file watching!');
	}

	/**
	 * Setup file change event listeners (Day 5)
	 */
	private setupFileChangeListeners(): void {
		// Listen for file modifications
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (file instanceof TFile && file.path.endsWith('.excalidraw.md')) {
					await this.frameIndexer.handleFileModification(file);
				}
			})
		);

		// Listen for file deletions
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.path.endsWith('.excalidraw.md')) {
					this.frameIndexer.handleFileDeletion(file);
				}
			})
		);

		// Listen for file renames
		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (file instanceof TFile && (file.path.endsWith('.excalidraw.md') || oldPath.endsWith('.excalidraw.md'))) {
					await this.frameIndexer.handleFileRename(file, oldPath);
				}
			})
		);

		console.log('✅ File change listeners registered');
	}

	onunload(): void {
		console.log('👋 Excalink plugin unloaded');
	}
}