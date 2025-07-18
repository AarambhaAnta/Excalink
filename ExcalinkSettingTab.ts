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

        // Plugin header with description
        containerEl.createEl('h1', { text: 'Excalink Plugin Settings' });
        
        const descEl = containerEl.createEl('p');
        descEl.innerHTML = `
            Configure your Excalink plugin for optimal frame suggestion experience. 
            <br><br>
            <strong>🖼️ Excalink</strong> enables smart auto-suggestion of frame names from 
            <code>.excalidraw.md</code> files when typing <code>[[filename#</code> in your notes.
        `;
        descEl.style.marginBottom = '20px';
        descEl.style.padding = '10px';
        descEl.style.backgroundColor = 'var(--background-secondary)';
        descEl.style.borderRadius = '8px';

        // Core Functionality Section
        containerEl.createEl('h2', { text: '🚀 Core Functionality' });

        new Setting(containerEl)
            .setName('Enable Frame Suggestions')
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
            .setName('Enable Input Debouncing')
            .setDesc('Delays processing of typing patterns to improve performance. Recommended for better user experience.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDebouncing)
                .onChange(async (value) => {
                    this.plugin.settings.enableDebouncing = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Debounce Delay')
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
        containerEl.createEl('h2', { text: '🎭 Suggestion Modal' });

        new Setting(containerEl)
            .setName('Enable Fuzzy Search')
            .setDesc('Allow partial and fuzzy matching of frame names. Makes it easier to find frames with typos or partial input.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFuzzySearch)
                .onChange(async (value) => {
                    this.plugin.settings.enableFuzzySearch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Recent Frames First')
            .setDesc('Display recently created frames at the top of suggestions. Helps find new frames quickly.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showRecentFramesFirst)
                .onChange(async (value) => {
                    this.plugin.settings.showRecentFramesFirst = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Suggestions Displayed')
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
        containerEl.createEl('h2', { text: '⚡ Performance' });

        new Setting(containerEl)
            .setName('Enable Caching')
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
            .setName('Enable File Watching')
            .setDesc('Automatically update frame index when Excalidraw files are modified. Keeps suggestions current but uses more resources.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableFileWatching)
                .onChange(async (value) => {
                    this.plugin.settings.enableFileWatching = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Maximum Cache Size')
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
        containerEl.createEl('h2', { text: '🎨 User Interface' });

        new Setting(containerEl)
            .setName('Modal Theme')
            .setDesc('Choose the visual style for the frame suggestion modal.')
            .addDropdown(dropdown => dropdown
                .addOption('default', 'Default Theme')
                .addOption('minimal', 'Minimal Theme')
                .setValue(this.plugin.settings.modalTheme)
                .onChange(async (value: 'default' | 'minimal') => {
                    this.plugin.settings.modalTheme = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Frame Icons')
            .setDesc('Display 🖼️ icons next to frame names in suggestions.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFrameIcons)
                .onChange(async (value) => {
                    this.plugin.settings.showFrameIcons = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show File Context')
            .setDesc('Display "in filename" context below each frame suggestion.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFileContext)
                .onChange(async (value) => {
                    this.plugin.settings.showFileContext = value;
                    await this.plugin.saveSettings();
                }));

        // Debug Section
        containerEl.createEl('h2', { text: '🔬 Debug & Diagnostics' });

        new Setting(containerEl)
            .setName('Enable Debug Logging')
            .setDesc('Show detailed logging in the console. Useful for troubleshooting but may impact performance.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDebugLogging)
                .onChange(async (value) => {
                    this.plugin.settings.enableDebugLogging = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Diagnostics in Notices')
            .setDesc('Display plugin status and statistics as Obsidian notices.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDiagnosticsInNotices)
                .onChange(async (value) => {
                    this.plugin.settings.showDiagnosticsInNotices = value;
                    await this.plugin.saveSettings();
                }));

        // Action Buttons Section
        containerEl.createEl('h2', { text: '🛠️ Actions' });

        // Force rescan button
        new Setting(containerEl)
            .setName('Force Rescan Files')
            .setDesc('Manually scan all Excalidraw files and rebuild the frame index.')
            .addButton(button => button
                .setButtonText('Rescan Now')
                .setClass('mod-cta')
                .onClick(async () => {
                    button.setButtonText('Scanning...');
                    button.setDisabled(true);
                    
                    try {
                        await this.plugin.forceRescan();
                        button.setButtonText('✅ Complete');
                        setTimeout(() => {
                            button.setButtonText('Rescan Now');
                            button.setDisabled(false);
                        }, 2000);
                    } catch (error) {
                        button.setButtonText('❌ Failed');
                        setTimeout(() => {
                            button.setButtonText('Rescan Now');
                            button.setDisabled(false);
                        }, 2000);
                    }
                }));

        // Reset settings button
        new Setting(containerEl)
            .setName('Reset Settings')
            .setDesc('Restore all settings to their default values.')
            .addButton(button => button
                .setButtonText('Reset to Defaults')
                .setWarning()
                .onClick(async () => {
                    // Confirm reset
                    const confirmed = await this.showConfirmationDialog(
                        'Reset Settings', 
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
        infoEl.style.marginTop = '30px';
        infoEl.style.padding = '15px';
        infoEl.style.backgroundColor = 'var(--background-secondary)';
        infoEl.style.borderRadius = '8px';
        infoEl.style.borderLeft = '4px solid var(--interactive-accent)';
        
        infoEl.createEl('h3', { text: '📋 Plugin Information' });
        infoEl.createEl('p', { text: `Version: ${this.plugin.manifest.version}` });
        infoEl.createEl('p', { text: `Author: ${this.plugin.manifest.author}` });
        infoEl.createEl('p').innerHTML = `Repository: <a href="https://github.com/AarambhaAnta/Excalink" target="_blank">GitHub</a>`;
        
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
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';
        
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
