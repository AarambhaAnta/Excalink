import { Plugin, TFile, Notice } from "obsidian";
import { FrameIndexer } from "FrameIndexer";
import { EditorExtension } from "EditorExtension";

/**
 * Excalink Plugin - Day 6: Polished and robust implementation
 * Enhanced with comprehensive error handling and graceful fallbacks
 */
export default class Excalink extends Plugin{
	private frameIndexer: FrameIndexer;
	private editorExtension: EditorExtension;
	private isInitialized = false;

	async onload(): Promise<void> {
		try {
			// console.log('🚀 Excalink plugin loading...');

			// Initialize frame indexer with enhanced error handling (Day 1)
			try {
				this.frameIndexer = new FrameIndexer(this.app.vault);
				await this.frameIndexer.scanAllExcalidrawFiles();
				// console.log('✅ Frame indexer initialized successfully');
			} catch (error) {
				console.error('❌ Failed to initialize frame indexer:', error);
				new Notice('Excalink: Failed to scan Excalidraw files. Plugin will work with limited functionality.');
				// Create a fallback frame indexer to prevent crashes
				this.frameIndexer = new FrameIndexer(this.app.vault);
			}

			// Initialize editor extension with validation (Day 2)
			try {
				// console.log('🎯 Setting up editor extension...');
				
				if (!this.app) {
					throw new Error('App instance not available');
				}
				
				this.editorExtension = new EditorExtension(this.frameIndexer, this.app);
				this.registerEditorExtension(this.editorExtension.getExtension());
				// console.log('✅ Editor extension registered successfully');
			} catch (error) {
				console.error('❌ Failed to initialize editor extension:', error);
				new Notice('Excalink: Failed to initialize editor integration. Please restart Obsidian.');
				return;
			}

			// Day 5: Register file change event listeners for caching
			try {
				// console.log('📡 Setting up file change listeners...');
				this.setupFileChangeListeners();
				// console.log('✅ File change listeners registered');
			} catch (error) {
				console.error('❌ Failed to setup file change listeners:', error);
				console.warn('⚠️ File watching disabled - frames will not auto-update');
			}

			// Add debug commands with error handling
			try {
				this.setupDebugCommands();
				// console.log('✅ Debug commands registered');
			} catch (error) {
				console.error('❌ Failed to register debug commands:', error);
			}

			this.isInitialized = true;
			// console.log('✅ Excalink plugin loaded successfully with all features!');
			
		} catch (error) {
			console.error('❌ Critical error during plugin loading:', error);
			new Notice('Excalink: Plugin failed to load. Check console for details.');
		}
	}

	/**
	 * Setup debug commands for monitoring and troubleshooting
	 * Day 6: Enhanced with comprehensive diagnostics
	 */
	private setupDebugCommands(): void {
		// Cache statistics command
		this.addCommand({
			id: 'show-cache-stats',
			name: 'Show Cache Statistics',
			callback: () => {
				try {
					const stats = this.frameIndexer.getCacheStats();
					// console.log('📊 Cache Statistics:', stats);
					
					const message = `Cache Statistics:\n` +
						`Files: ${stats.size}\n` +
						`Frames: ${stats.frameCount}\n` +
						`Memory: ${stats.memoryUsage}`;
					
					new Notice(message, 5000);
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
					// console.log('🔍 Plugin Diagnostics:', diagnostics);
					
					const message = `Plugin Diagnostics:\n` +
						`Initialized: ${diagnostics.isInitialized ? '✅' : '❌'}\n` +
						`Files: ${diagnostics.totalFiles}\n` +
						`Frames: ${diagnostics.totalFrames}\n` +
						`Cache: ${diagnostics.cacheSize} entries`;
					
					new Notice(message, 7000);
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
					// console.log('🔄 Force rescanning all Excalidraw files...');
					new Notice('Rescanning Excalidraw files...');
					
					this.frameIndexer.clearCache();
					await this.frameIndexer.scanAllExcalidrawFiles();
					
					const stats = this.frameIndexer.getCacheStats();
					const message = `Rescan complete! Found ${stats.frameCount} frames in ${stats.size} files.`;
					
					// console.log('✅ Force rescan completed');
					new Notice(message, 3000);
				} catch (error) {
					console.error('❌ Error during force rescan:', error);
					new Notice('Error during rescan. Check console for details.');
				}
			}
		});

		// Comprehensive testing command (Day 6)
		this.addCommand({
			id: 'run-comprehensive-tests',
			name: 'Run Comprehensive Tests',
			callback: () => {
				try {
					// console.log('🔬 Starting comprehensive plugin tests...');
					new Notice('Running comprehensive tests...');
					
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
	 * Day 6: Ensures all resources are properly released
	 */
	onunload(): void {
		try {
			// console.log('👋 Excalink plugin unloading...');
			
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
					// console.log('✅ Editor extension cleanup handled by Obsidian');
				} catch (error) {
					console.warn('⚠️ Error during editor extension cleanup:', error);
				}
			}
			
			this.isInitialized = false;
			// console.log('✅ Excalink plugin unloaded successfully');
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