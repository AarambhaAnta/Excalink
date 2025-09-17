import { App, PluginSettingTab, Setting } from "obsidian";
import Excalink from "main";
import { ExcalinkSettings, DEFAULT_SETTINGS } from "settings";

/**
 * Settings Tab for Excalink Plugin
 * Day 7: Settings & Release - User configuration interface
 */
export class ExcalinkSettingTab extends PluginSettingTab {
    plugin: Excalink;

    constructor(app: App, plugin: Excalink) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Plugin description (no top-level heading as per Obsidian guidelines)
        const descEl = containerEl.createEl('p', { cls: 'excalink-description' });
        descEl.appendText('Configure your Excalink plugin for optimal frame suggestion experience.');
        descEl.createEl('br');
        descEl.createEl('br');
        const strongEl = descEl.createEl('strong');
        strongEl.textContent = '🖼️ Excalink';
        descEl.appendText(' enables smart auto-suggestion of frame names from ');
        descEl.createEl('code', { text: '.excalidraw.md' });
        descEl.appendText(' files when typing ');
        descEl.createEl('code', { text: '[[filename#' });
        descEl.appendText(' in your notes.');

        // Core Functionality Section
        new Setting(containerEl)
            .setName('Core functionality')
            .setHeading();

        new Setting(containerEl)
            .setName('Enable frame suggestions')
            .setDesc('Turn on/off the main frame suggestion functionality. When disabled, no suggestions will appear.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFrameSuggestions)
                .onChange(async (value) => {
                    this.plugin.settings.enableFrameSuggestions = value;
                    await this.plugin.saveSettings();
                    
                    if (value) {
                        // Re-enable functionality
                        await this.plugin.initializeCore();
                    } else {
                        // Disable functionality
                        this.plugin.disableCore();
                    }
                }));

        new Setting(containerEl)
            .setName('Enable input debouncing')
            .setDesc('Delays processing of typing patterns to improve performance. Recommended for better user experience.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDebouncing)
                .onChange(async (value) => {
                    this.plugin.settings.enableDebouncing = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Debounce delay')
            .setDesc('Time to wait (in milliseconds) after typing before showing suggestions. Lower = more responsive, Higher = less CPU usage.')
            .addSlider(slider => slider
                .setLimits(100, 1000, 50)
                .setValue(this.plugin.settings.debounceDelay)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.debounceDelay = value;
                    await this.plugin.saveSettings();
                }));

        // Modal Behavior Section
        new Setting(containerEl)
            .setName('Suggestion modal')
            .setHeading();

        new Setting(containerEl)
            .setName('Enable fuzzy search')
            .setDesc('Allow partial and fuzzy matching of frame names. Makes it easier to find frames with typos or partial input.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFuzzySearch)
                .onChange(async (value) => {
                    this.plugin.settings.enableFuzzySearch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show recent frames first')
            .setDesc('Display recently created frames at the top of suggestions. Helps find new frames quickly.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showRecentFramesFirst)
                .onChange(async (value) => {
                    this.plugin.settings.showRecentFramesFirst = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max suggestions displayed')
            .setDesc('Maximum number of frame suggestions to show in the modal. Lower numbers improve performance for large drawings.')
            .addSlider(slider => slider
                .setLimits(10, 100, 5)
                .setValue(this.plugin.settings.maxSuggestionsDisplayed)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxSuggestionsDisplayed = value;
                    await this.plugin.saveSettings();
                }));

        // Performance Section
        new Setting(containerEl)
            .setName('Performance')
            .setHeading();

        new Setting(containerEl)
            .setName('Enable caching')
            .setDesc('Cache processed Excalidraw files to improve performance. Files are only re-processed when changed.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCaching)
                .onChange(async (value) => {
                    this.plugin.settings.enableCaching = value;
                    await this.plugin.saveSettings();
                    
                    if (!value) {
                        // Clear cache when disabled
                        this.plugin.frameIndexer?.clearCache();
                    }
                }));

        new Setting(containerEl)
            .setName('Enable file watching')
            .setDesc('Automatically update frame index when Excalidraw files are modified. Keeps suggestions current but uses more resources.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFileWatching)
                .onChange(async (value) => {
                    this.plugin.settings.enableFileWatching = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Maximum cache size')
            .setDesc('Maximum number of files to keep in cache. Higher values use more memory but improve performance.')
            .addSlider(slider => slider
                .setLimits(10, 500, 10)
                .setValue(this.plugin.settings.maxCacheSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxCacheSize = value;
                    await this.plugin.saveSettings();
                }));

        // UI Preferences Section
        new Setting(containerEl)
            .setName('User interface')
            .setHeading();

        new Setting(containerEl)
            .setName('Modal theme')
            .setDesc('Choose the visual style for the frame suggestion modal.')
            .addDropdown(dropdown => dropdown
                .addOption('default', 'Default theme')
                .addOption('minimal', 'Minimal theme')
                .setValue(this.plugin.settings.modalTheme)
                .onChange(async (value: 'default' | 'minimal') => {
                    this.plugin.settings.modalTheme = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show frame icons')
            .setDesc('Display 🖼️ icons next to frame names in suggestions.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFrameIcons)
                .onChange(async (value) => {
                    this.plugin.settings.showFrameIcons = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show file context')
            .setDesc('Display "in filename" context below each frame suggestion.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFileContext)
                .onChange(async (value) => {
                    this.plugin.settings.showFileContext = value;
                    await this.plugin.saveSettings();
                }));

        // Debug Section
        new Setting(containerEl)
            .setName('Debug & diagnostics')
            .setHeading();

        new Setting(containerEl)
            .setName('Enable debug logging')
            .setDesc('Show detailed logging in the console. Useful for troubleshooting but may impact performance.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDebugLogging)
                .onChange(async (value) => {
                    this.plugin.settings.enableDebugLogging = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show diagnostics in notices')
            .setDesc('Display plugin status and statistics as Obsidian notices.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDiagnosticsInNotices)
                .onChange(async (value) => {
                    this.plugin.settings.showDiagnosticsInNotices = value;
                    await this.plugin.saveSettings();
                }));

        // Action Buttons Section
        new Setting(containerEl)
            .setName('Actions')
            .setHeading();

        // Force rescan button
        new Setting(containerEl)
            .setName('Force rescan files')
            .setDesc('Manually scan all Excalidraw files and rebuild the frame index.')
            .addButton(button => button
                .setButtonText('Rescan now')
                .setClass('mod-cta')
                .onClick(async () => {
                    button.setButtonText('Scanning...');
                    button.setDisabled(true);
                    
                    try {
                        await this.plugin.forceRescan();
                        button.setButtonText('✅ Complete');
                        setTimeout(() => {
                            button.setButtonText('Rescan now');
                            button.setDisabled(false);
                        }, 2000);
                    } catch (error) {
                        button.setButtonText('❌ Failed');
                        setTimeout(() => {
                            button.setButtonText('Rescan now');
                            button.setDisabled(false);
                        }, 2000);
                    }
                }));

        // Reset settings button
        new Setting(containerEl)
            .setName('Reset settings')
            .setDesc('Restore all settings to their default values.')
            .addButton(button => button
                .setButtonText('Reset to defaults')
                .setWarning()
                .onClick(async () => {
                    // Confirm reset
                    const confirmed = await this.showConfirmationDialog(
                        'Reset settings', 
                        'Are you sure you want to reset all settings to their default values? This action cannot be undone.'
                    );
                    
                    if (confirmed) {
                        this.plugin.settings = { ...DEFAULT_SETTINGS };
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings display
                    }
                }));

        // Plugin info section
        const infoEl = containerEl.createEl('div');
        infoEl.addClass('excalink-plugin-info');
        
        infoEl.createEl('h3', { text: 'Plugin information' });
        infoEl.createEl('p', { text: `Version: ${this.plugin.manifest.version}` });
        infoEl.createEl('p', { text: `Author: ${this.plugin.manifest.author}` });
        const repoEl = infoEl.createEl('p');
        repoEl.appendText('Repository: ');
        const linkEl = repoEl.createEl('a', { href: 'https://github.com/AarambhaAnta/Excalink', text: 'GitHub' });
        linkEl.setAttr('target', '_blank');
        
        // Status information
        if (this.plugin.frameIndexer?.isReady()) {
            const diagnostics = this.plugin.frameIndexer.getDiagnostics();
            infoEl.createEl('p', { text: `Status: ✅ Active (${diagnostics.totalFrames} frames in ${diagnostics.totalFiles} files)` });
        } else {
            infoEl.createEl('p', { text: 'Status: ❌ Not initialized' });
        }
    }

    /**
     * Show a confirmation dialog
     */
    private async showConfirmationDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmationModal(this.app, title, message, (result) => {
                resolve(result);
            });
            modal.open();
        });
    }
}

/**
 * Simple confirmation modal
 */
class ConfirmationModal extends Modal {
    private title: string;
    private message: string;
    private callback: (result: boolean) => void;

    constructor(app: App, title: string, message: string, callback: (result: boolean) => void) {
        super(app);
        this.title = title;
        this.message = message;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });
        
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.onclick = () => {
            this.callback(false);
            this.close();
        };
        
        const confirmButton = buttonContainer.createEl('button', { text: 'Confirm', cls: 'mod-cta' });
        confirmButton.onclick = () => {
            this.callback(true);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Import Modal class
import { Modal } from "obsidian";
