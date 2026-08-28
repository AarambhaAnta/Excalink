import { Notice, Plugin, TFile } from "obsidian";
import { DrawingIndexer } from "./indexer";
import { LinkDetector } from "./editor/linkDetector";
import { ExcalinkSettings, DEFAULT_SETTINGS } from "./settings";
import { ExcalinkSettingTab } from "./settingsTab";

export default class Excalink extends Plugin {
	settings: ExcalinkSettings;
	indexer: DrawingIndexer;

	async onload(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<ExcalinkSettings>);
		this.addSettingTab(new ExcalinkSettingTab(this.app, this));

		this.indexer = new DrawingIndexer(this.app.vault);
		await this.indexer.scanAll();

		const linkDetector = new LinkDetector(this.indexer, this.app, this);
		this.registerEditorExtension(linkDetector.getExtension());

		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (file instanceof TFile) await this.indexer.handleFileModification(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) this.indexer.handleFileDeletion(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				if (file instanceof TFile) await this.indexer.handleFileRename(file, oldPath);
			}),
		);

		this.addCommand({
			id: "rescan-vault",
			name: "Rescan vault for Excalidraw drawings",
			callback: () => this.rescan(),
		});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async rescan(): Promise<void> {
		const { files, targets } = await this.indexer.rescan();
		new Notice(`Excalink: found ${targets} drawing(s) across ${files} file(s).`);
	}
}
