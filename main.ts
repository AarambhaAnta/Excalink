import { Plugin } from "obsidian";
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

		console.log('✅ Excalink plugin loaded with editor integration!');
	}

	onunload(): void {
		console.log('👋 Excalink plugin unloaded');
	}
}