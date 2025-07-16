import { Plugin } from "obsidian";
import { FrameIndexer } from "FrameIndexer";

export default class Excalink extends Plugin{
	private frameIndexer: FrameIndexer;

	async onload(): Promise<void> {
		console.log('🚀 Excalink plugin loading...');

		this.frameIndexer = new FrameIndexer(this.app.vault);

		await this.frameIndexer.scanAllExcalidrawFiles();
	}

	onunload(): void {
		console.log('👋 Excalink plugin unloaded');
	}
}