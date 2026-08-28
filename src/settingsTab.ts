import { App, PluginSettingTab, Setting } from "obsidian";
import Excalink from "./main";

export class ExcalinkSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: Excalink) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const descEl = containerEl.createEl("p", { cls: "excalink-description" });
		descEl.appendText("Excalink suggests the named frames and groups inside your ");
		descEl.createEl("code", { text: ".excalidraw.md" });
		descEl.appendText(" drawings as you type ");
		descEl.createEl("code", { text: "[[filename#" });
		descEl.appendText(".");

		new Setting(containerEl).setName("Suggestions").setHeading();

		new Setting(containerEl)
			.setName("Enable suggestions")
			.setDesc("Show the drawing picker while typing [[filename#.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableSuggestions).onChange(async (value) => {
					this.plugin.settings.enableSuggestions = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Include frames")
			.setDesc("Suggest named frames from the drawing.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeFrames).onChange(async (value) => {
					this.plugin.settings.includeFrames = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Include groups")
			.setDesc("Suggest grouped elements from the drawing.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeGroups).onChange(async (value) => {
					this.plugin.settings.includeGroups = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Show recent first")
			.setDesc("Display the most recently added frames and groups at the top.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showRecentFirst).onChange(async (value) => {
					this.plugin.settings.showRecentFirst = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Max suggestions displayed")
			.setDesc("Maximum number of suggestions to show in the picker.")
			.addSlider((slider) =>
				slider
					.setLimits(10, 100, 5)
					.setValue(this.plugin.settings.maxSuggestions)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxSuggestions = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show file context")
			.setDesc('Display the "in filename" subtitle below each suggestion.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showFileContext).onChange(async (value) => {
					this.plugin.settings.showFileContext = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName("Actions").setHeading();

		new Setting(containerEl)
			.setName("Rescan vault")
			.setDesc("Rebuild the frame and group index from every Excalidraw drawing.")
			.addButton((button) =>
				button
					.setButtonText("Rescan now")
					.setClass("mod-cta")
					.onClick(async () => {
						button.setButtonText("Scanning...").setDisabled(true);
						await this.plugin.rescan();
						button.setButtonText("Rescan now").setDisabled(false);
					}),
			);

		const infoEl = containerEl.createDiv({ cls: "excalink-plugin-info" });
		infoEl.createEl("p", { text: `Version: ${this.plugin.manifest.version}` });
		const repoEl = infoEl.createEl("p");
		repoEl.appendText("Repository: ");
		repoEl.createEl("a", {
			href: "https://github.com/AarambhaAnta/Excalink",
			text: "GitHub",
			attr: { target: "_blank", rel: "noopener" },
		});
	}
}
