import { Plugin, TFile, Notice } from "obsidian";
import { FrameIndexer } from "FrameIndexer";
import { EditorExtension } from "EditorExtension";
import { ExcalinkSettings, DEFAULT_SETTINGS } from "settings";
import { ExcalinkSettingTab } from "ExcalinkSettingTab";

/**
 * Excalink Plugin - Day 7: Settings & Release
 * Enhanced with comprehensive settings and user configuration
 */
export default class Excalink extends Plugin{
	public settings: ExcalinkSettings;
	public frameIndexer: FrameIndexer;
	private editorExtension: EditorExtension | null;
	private isInitialized = false;

	async onload(): Promise<void> {
		try {
			// Load settings first
			await this.loadSettings();

			// Add settings tab
			this.addSettingTab(new ExcalinkSettingTab(this.app, this));

			// Only initialize core functionality if enabled
			if (this.settings.enableFrameSuggestions) {
				await this.initializeCore();
			}

			this.isInitialized = true;
			
		} catch (error) {
			console.error('❌ Critical error during plugin loading:', error);
			new Notice('Excalink: Plugin failed to load. Check console for details.');
		}
	}

	/**
	 * Load plugin settings with fallbacks
	 */
	async loadSettings(): Promise<void> {
		try {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		} catch (error) {
			console.error('❌ Error loading settings, using defaults:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings(): Promise<void> {
		try {
			await this.saveData(this.settings);
		} catch (error) {
			console.error('❌ Error saving settings:', error);
			throw error;
		}
	}

	/**
	 * Initialize core plugin functionality
	 */
	async initializeCore(): Promise<void> {
		try {
			// Initialize frame indexer with enhanced error handling
			try {
				this.frameIndexer = new FrameIndexer(this.app.vault);
				await this.frameIndexer.scanAllExcalidrawFiles();
			} catch (error) {
				console.error('❌ Failed to initialize frame indexer:', error);
				new Notice('Excalink: Failed to scan Excalidraw files. Plugin will work with limited functionality.');
				// Create a fallback frame indexer to prevent crashes
				this.frameIndexer = new FrameIndexer(this.app.vault);
			}

			// Initialize editor extension with validation
			try {
				if (!this.app) {
					throw new Error('App instance not available');
				}
				
				this.editorExtension = new EditorExtension(this.frameIndexer, this.app, this);
				this.registerEditorExtension(this.editorExtension.getExtension());
			} catch (error) {
				console.error('❌ Failed to initialize editor extension:', error);
				new Notice('Excalink: Failed to initialize editor integration. Please restart Obsidian.');
				return;
			}

			// Register file change event listeners for caching (if enabled)
			if (this.settings.enableFileWatching) {
				try {
					this.setupFileChangeListeners();
				} catch (error) {
					console.error('❌ Failed to setup file change listeners:', error);
					console.warn('⚠️ File watching disabled - frames will not auto-update');
				}
			}

			// Add debug commands with error handling
			try {
				this.setupDebugCommands();
			} catch (error) {
				console.error('❌ Failed to register debug commands:', error);
			}

		} catch (error) {
			console.error('❌ Error initializing core functionality:', error);
			throw error;
		}
	}

	/**
	 * Disable core plugin functionality
	 */
	disableCore(): void {
		try {
			// The editor extension will be automatically cleaned up by Obsidian
			// when we unregister it, but we need to set our reference to null
			this.editorExtension = null;

		} catch (error) {
			console.error('❌ Error disabling core functionality:', error);
		}
	}

	/**
	 * Force rescan of all files (public method for settings)
	 */
	async forceRescan(): Promise<void> {
		try {
			if (!this.frameIndexer) {
				throw new Error('Frame indexer not initialized');
			}

			this.frameIndexer.clearCache();
			await this.frameIndexer.scanAllExcalidrawFiles();
			
			const stats = this.frameIndexer.getCacheStats();
			const message = `Rescan complete! Found ${stats.frameCount} frames in ${stats.size} files.`;
			
			if (this.settings.showDiagnosticsInNotices) {
				new Notice(message, 3000);
			}
			
		} catch (error) {
			console.error('❌ Error during force rescan:', error);
			throw error;
		}
	}

	/**
	 * Setup debug commands for monitoring and troubleshooting
	 * Day 7: Enhanced with settings integration
	 */
	private setupDebugCommands(): void {
		// Cache statistics command
		this.addCommand({
			id: 'show-cache-stats',
			name: 'Show Cache Statistics',
			callback: () => {
				try {
					const stats = this.frameIndexer.getCacheStats();
					if (this.settings.enableDebugLogging) {
						console.log('📊 Cache Statistics:', stats);
					}
					
					const message = `Cache Statistics:\n` +
						`Files: ${stats.size}\n` +
						`Frames: ${stats.frameCount}\n` +
						`Memory: ${stats.memoryUsage}`;
					
					if (this.settings.showDiagnosticsInNotices) {
						new Notice(message, 5000);
					}
				} catch (error) {
					console.error('❌ Error getting cache stats:', error);
					new Notice('Error retrieving cache statistics');
				}
			}
		});

		// Full diagnostics command
		this.addCommand({
			id: 'show-diagnostics',
			name: 'Show Plugin Diagnostics',
			callback: () => {
				try {
					const diagnostics = this.frameIndexer.getDiagnostics();
					if (this.settings.enableDebugLogging) {
						console.log('🔍 Plugin Diagnostics:', diagnostics);
					}
					
					const message = `Plugin Diagnostics:\n` +
						`Initialized: ${diagnostics.isInitialized ? '✅' : '❌'}\n` +
						`Files: ${diagnostics.totalFiles}\n` +
						`Frames: ${diagnostics.totalFrames}\n` +
						`Cache: ${diagnostics.cacheSize} entries`;
					
					if (this.settings.showDiagnosticsInNotices) {
						new Notice(message, 7000);
					}
				} catch (error) {
					console.error('❌ Error getting diagnostics:', error);
					new Notice('Error retrieving diagnostics');
				}
			}
		});

		// Force rescan command
		this.addCommand({
			id: 'force-rescan',
			name: 'Force Rescan All Files',
			callback: async () => {
				try {
					if (this.settings.enableDebugLogging) {
						console.log('🔄 Force rescanning all Excalidraw files...');
					}
					new Notice('Rescanning Excalidraw files...');
					
					await this.forceRescan();
				} catch (error) {
					console.error('❌ Error during force rescan:', error);
					new Notice('Error during rescan. Check console for details.');
				}
			}
		});

		// Comprehensive testing command (Day 7)
		this.addCommand({
			id: 'run-comprehensive-tests',
			name: 'Run Comprehensive Tests',
			callback: () => {
				try {
					if (this.settings.enableDebugLogging) {
						console.log('🔬 Starting comprehensive plugin tests...');
					}
					new Notice('Running comprehensive tests...');
					
					if (!this.editorExtension) {
						throw new Error('Editor extension not initialized');
					}
					const allTestsPassed = this.editorExtension.runComprehensiveTests();
					
					const message = allTestsPassed ? 
						'✅ All tests passed!' : 
						'❌ Some tests failed. Check console for details.';
					
					new Notice(message, 4000);
				} catch (error) {
					console.error('❌ Error running comprehensive tests:', error);
					new Notice('Error running tests. Check console for details.');
				}
			}
		});
	}

	/**
	 * Setup file change event listeners (Day 5)
	 * Day 6: Enhanced with comprehensive error handling and validation
	 */
	private setupFileChangeListeners(): void {
		try {
			// Listen for file modifications with enhanced error handling
			this.registerEvent(
				this.app.vault.on('modify', async (file) => {
					try {
						if (file instanceof TFile && file.path && file.path.endsWith('.excalidraw.md')) {
							await this.frameIndexer.handleFileModification(file);
						}
					} catch (error) {
						console.error(`❌ Error handling file modification for ${file?.path || 'unknown'}:`, error);
					}
				})
			);

			// Listen for file deletions with validation
			this.registerEvent(
				this.app.vault.on('delete', (file) => {
					try {
						if (file instanceof TFile && file.path && file.path.endsWith('.excalidraw.md')) {
							this.frameIndexer.handleFileDeletion(file);
						}
					} catch (error) {
						console.error(`❌ Error handling file deletion for ${file?.path || 'unknown'}:`, error);
					}
				})
			);

			// Listen for file renames with comprehensive validation
			this.registerEvent(
				this.app.vault.on('rename', async (file, oldPath) => {
					try {
						if (file instanceof TFile && 
							oldPath && 
							typeof oldPath === 'string' &&
							(file.path.endsWith('.excalidraw.md') || oldPath.endsWith('.excalidraw.md'))) {
							await this.frameIndexer.handleFileRename(file, oldPath);
						}
					} catch (error) {
						console.error(`❌ Error handling file rename from ${oldPath || 'unknown'} to ${file?.path || 'unknown'}:`, error);
					}
				})
			);

			// console.log('✅ File change listeners registered successfully');
		} catch (error) {
			console.error('❌ Error setting up file change listeners:', error);
			throw error;
		}
	}

	/**
	 * Plugin unload with enhanced cleanup
	 * Day 7: Ensures all resources are properly released
	 */
	onunload(): void {
		try {
			if (this.settings.enableDebugLogging) {
				console.log('👋 Excalink plugin unloading...');
			}
			
			// Clean up frame indexer
			if (this.frameIndexer) {
				try {
					this.frameIndexer.clearCache();
				} catch (error) {
					console.warn('⚠️ Error clearing frame indexer cache:', error);
				}
			}
			
			// Clean up editor extension
			if (this.editorExtension) {
				try {
					// The extension will be automatically cleaned up by Obsidian
					if (this.settings.enableDebugLogging) {
						console.log('✅ Editor extension cleanup handled by Obsidian');
					}
				} catch (error) {
					console.warn('⚠️ Error during editor extension cleanup:', error);
				}
			}
			
			this.isInitialized = false;
			if (this.settings.enableDebugLogging) {
				console.log('✅ Excalink plugin unloaded successfully');
			}
		} catch (error) {
			console.error('❌ Error during plugin unload:', error);
		}
	}

	/**
	 * Check if plugin is properly initialized
	 * Day 6: Public method for debugging and validation
	 */
	public isReady(): boolean {
		return this.isInitialized && 
			   !!this.frameIndexer && 
			   this.frameIndexer.isReady() && 
			   !!this.editorExtension;
	}
}