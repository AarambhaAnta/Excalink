import { TFile, Vault } from "obsidian";
import { ExcalidrawDecompressor } from "ExcalidrawDecompressor";

export interface FrameInfo{
    name: string;
    id: string;
}

export interface FileFrameMap {
    [fileName: string]: FrameInfo[];
}

/**
 * Cache entry to store file content hash and frames
 */
interface CacheEntry {
    contentHash: string;
    frames: FrameInfo[];
    lastModified: number;
}

/**
 * Enhanced FrameIndexer with robust error handling and performance optimization
 * Day 6: Polish & Test - Handles malformed files gracefully
 */
export class FrameIndexer{
    private vault: Vault;
    private frameIndex: FileFrameMap = {};
    
    // Day 5: Performance caching system
    private frameCache: Map<string, CacheEntry> = new Map();
    private isInitialized: boolean = false;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    /**
     * Scan all Excalidraw files with enhanced error handling
     * Handles nested folders, broken files, and various edge cases
     */
    async scanAllExcalidrawFiles(): Promise<void>{
        try {
            console.log('🔍 Starting comprehensive Excalidraw file scan with caching...');

            const markdownFiles = this.vault.getMarkdownFiles();
            const excalidrawFiles = markdownFiles.filter(file => {
                // Enhanced validation for robust file filtering
                return file && 
                       file.path && 
                       file.path.endsWith('.excalidraw.md') && 
                       file.stat && 
                       file.basename;
            });

            console.log(`Found ${excalidrawFiles.length} valid Excalidraw files`);

            // Clear the frame index but keep cache for performance
            this.frameIndex = {};
            
            let cacheHits = 0;
            let cacheMisses = 0;
            let skippedFiles = 0;
            let processedFiles = 0;

            for (const file of excalidrawFiles) {
                try {
                    const wasFromCache = await this.extractFramesFromFileWithCache(file);
                    if (wasFromCache) {
                        cacheHits++;
                    } else {
                        cacheMisses++;
                    }
                    processedFiles++;
                } catch (error) {
                    console.error(`❌ Failed to process file ${file.path}:`, error);
                    skippedFiles++;
                    // Continue processing other files - don't fail entire scan
                }
            }

            console.log(`📊 Scan complete:`);
            console.log(`   ✅ Processed: ${processedFiles} files`);
            console.log(`   💾 Cache hits: ${cacheHits}`); 
            console.log(`   🔄 Cache misses: ${cacheMisses}`);
            console.log(`   ⚠️ Skipped: ${skippedFiles} files`);
            console.log('📜 Final frame index:', this.frameIndex);
            
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Critical error during file scan:', error);
            this.isInitialized = false;
            throw new Error(`Failed to scan Excalidraw files: ${error.message}`);
        }
    }

    /**
     * Extract frames from file with enhanced caching and error handling
     * Returns true if loaded from cache, false if file was processed
     */
    private async extractFramesFromFileWithCache(file: TFile): Promise<boolean> {
        try {
            // Enhanced file validation
            if (!file || !file.path || !file.stat || !file.basename) {
                console.warn(`⚠️ Invalid file object for ${file?.path || 'unknown'}`);
                return false;
            }

            const filePath = file.path;
            const fileStats = file.stat;
            const currentModTime = fileStats.mtime;
            
            // Check if we have a valid cache entry
            const cacheEntry = this.frameCache.get(filePath);
            
            if (cacheEntry && cacheEntry.lastModified === currentModTime) {
                console.log(`💾 Cache hit for ${file.basename}`);
                
                // Use cached frames
                if (cacheEntry.frames.length > 0) {
                    this.frameIndex[file.basename] = cacheEntry.frames;
                    console.log(`📃 ${file.basename}: [${cacheEntry.frames.map(f => f.name).join(', ')}] (cached)`);
                } else {
                    console.log(`📄 ${file.basename}: No frames (cached)`);
                }
                
                return true; // From cache
            }
            
            console.log(`🔄 Cache miss for ${file.basename}, processing file...`);
            
            // Read and process the file with enhanced error handling
            const content = await this.vault.read(file);
            if (!content || content.trim().length === 0) {
                console.warn(`⚠️ Empty file: ${file.basename}`);
                
                // Cache empty result to avoid re-processing
                this.frameCache.set(filePath, {
                    contentHash: '',
                    frames: [],
                    lastModified: currentModTime
                });
                return false;
            }

            const frames = this.parseFramesFromContent(content, file.basename);
            const contentHash = this.generateContentHash(content);
            
            // Update cache
            this.frameCache.set(filePath, {
                contentHash,
                frames,
                lastModified: currentModTime
            });
            
            // Update frame index
            if (frames.length > 0) {
                this.frameIndex[file.basename] = frames;
                console.log(`📃 ${file.basename}: [${frames.map(f => f.name).join(', ')}] (processed)`);
            } else {
                console.log(`📄 ${file.basename}: No frames found`);
            }
            
            return false; // Not from cache
            
        } catch (error) {
            console.error(`❌ Error processing file ${file?.path || 'unknown'}:`, error);
            
            // Try to maintain previous cache entry if available
            const cacheEntry = this.frameCache.get(file?.path);
            if (cacheEntry) {
                console.log(`🔄 Using previous cache entry for ${file?.basename}`);
                if (cacheEntry.frames.length > 0) {
                    this.frameIndex[file.basename] = cacheEntry.frames;
                }
                return true;
            }
            
            return false;
        }
    }

    /**
     * Generate a simple hash for content change detection
     */
    private generateContentHash(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Parse frames from Excalidraw file content with comprehensive error handling
     * Supports both compressed and uncompressed formats
     * Handles malformed files gracefully
     */
    private parseFramesFromContent(content: string, filename?: string): FrameInfo[] {
        try {
            // Validate input
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                console.warn(`⚠️ Invalid or empty content provided for parsing${filename ? ` in ${filename}` : ''}`);
                return [];
            }

            // Look for compressed JSON first
            let jsonMatch = content.match(/```compressed-json\n([\s\S]*?)\n```/);
            let isCompressed = true;

            // Fallback to regular JSON
            if (!jsonMatch) {
                jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                isCompressed = false;
            }

            // Check for alternative JSON block formats (generic code blocks)
            if (!jsonMatch) {
                jsonMatch = content.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1].trim().startsWith('{')) {
                    isCompressed = false;
                    console.log(`🔍 Found generic code block with JSON-like content${filename ? ` in ${filename}` : ''}`);
                }
            }

            if (!jsonMatch) {
                console.log(`📄 No JSON block found${filename ? ` in ${filename}` : ''} - may be frame-less Excalidraw file`);
                return [];
            }

            console.log(`✅ ${isCompressed ? 'Compressed' : 'Regular'} JSON block found${filename ? ` in ${filename}` : ''}`);

            let excalidrawData;

            if (isCompressed) {
                console.log('🗜️ Compressed format detected - decompressing...');
                try {
                    excalidrawData = ExcalidrawDecompressor.decompress(jsonMatch[1]);
                    console.log('✅ Successfully decompressed data');
                } catch (error) {
                    console.error(`❌ Decompression failed${filename ? ` for ${filename}` : ''}:`, error.message);

                    // Try treating as regular JSON as fallback
                    try {
                        console.log('🔄 Trying fallback: parsing as regular JSON...');
                        excalidrawData = JSON.parse(jsonMatch[1]);
                        console.log('✅ Fallback successful - was actually uncompressed');
                    } catch (fallbackError) {
                        console.error(`❌ Both compression and JSON parsing failed${filename ? ` for ${filename}` : ''}`);
                        return [];
                    }
                }
            } else {
                console.log('📄 Regular JSON format detected');
                try {
                    excalidrawData = JSON.parse(jsonMatch[1]);
                    console.log('✅ Successfully parsed JSON');
                } catch (error) {
                    console.error(`❌ JSON parsing failed${filename ? ` for ${filename}` : ''}:`, error.message);
                    
                    // Try decompression as fallback
                    try {
                        console.log('🔄 Trying fallback: decompression...');
                        excalidrawData = ExcalidrawDecompressor.decompress(jsonMatch[1]);
                        console.log('✅ Fallback successful - was actually compressed');
                    } catch (fallbackError) {
                        console.error(`❌ Both JSON parsing and decompression failed${filename ? ` for ${filename}` : ''}`);
                        return [];
                    }
                }
            }

            // Validate the parsed data structure
            if (!excalidrawData || typeof excalidrawData !== 'object') {
                console.error(`❌ Invalid Excalidraw data structure${filename ? ` in ${filename}` : ''}`);
                return [];
            }

            // Extract frames with enhanced error handling
            return this.extractFramesFromExcalidrawData(excalidrawData, filename);

        } catch (error) {
            console.error(`❌ Critical error during frame parsing${filename ? ` for ${filename}` : ''}:`, error);
            return [];
        }
    }

    /**
     * Extract frames from parsed Excalidraw data with robust error handling
     * Supports comments above frame blocks for enhanced documentation
     */
    private extractFramesFromExcalidrawData(excalidrawData: any, filename?: string): FrameInfo[] {
        try {
            // Check for elements array
            if (!excalidrawData.elements || !Array.isArray(excalidrawData.elements)) {
                console.log(`📄 No elements array found${filename ? ` in ${filename}` : ''} - empty or frame-less drawing`);
                return [];
            }

            const frames: FrameInfo[] = [];
            const elements = excalidrawData.elements;

            console.log(`🔍 Processing ${elements.length} elements${filename ? ` in ${filename}` : ''}...`);

            for (let i = 0; i < elements.length; i++) {
                try {
                    const element = elements[i];
                    
                    // Validate element structure
                    if (!element || typeof element !== 'object') {
                        continue;
                    }

                    // Check if it's a frame element
                    if (element.type === 'frame' && element.name && typeof element.name === 'string') {
                        const frameName = element.name.trim();
                        const frameId = element.id || `frame_${i}`;

                        // Skip empty frame names
                        if (frameName.length === 0) {
                            console.warn(`⚠️ Skipping frame with empty name at index ${i}`);
                            continue;
                        }

                        // Look for comments above this frame (future enhancement)
                        const frameComment = this.findFrameComment(elements, i);

                        frames.push({
                            name: frameName,
                            id: frameId
                        });

                        console.log(`🖼️ Found frame: "${frameName}" (${frameId})${frameComment ? ` - ${frameComment}` : ''}`);
                    }
                } catch (elementError) {
                    console.warn(`⚠️ Error processing element ${i}${filename ? ` in ${filename}` : ''}:`, elementError);
                    // Continue processing other elements
                }
            }

            console.log(`✅ Extracted ${frames.length} frames total${filename ? ` from ${filename}` : ''}`);
            return frames;

        } catch (error) {
            console.error(`❌ Error extracting frames from Excalidraw data${filename ? ` for ${filename}` : ''}:`, error);
            return [];
        }
    }

    /**
     * Find comment text above a frame (future enhancement for better documentation)
     */
    private findFrameComment(elements: any[], frameIndex: number): string | null {
        try {
            // Look for text elements positioned above the frame
            // This is a placeholder for future enhancement
            return null;
        } catch (error) {
            return null;
        }
    }

    getFrameIndex(): FileFrameMap{
        return this.frameIndex;
    }

    getFramesForFile(fileName: string): FrameInfo[] {
        return this.frameIndex[fileName] || [];
    }

    /**
     * Handle file modification event with enhanced error handling
     */
    async handleFileModification(file: TFile): Promise<void> {
        if (!file?.path?.endsWith('.excalidraw.md')) {
            return;
        }

        console.log(`🔄 File modified: ${file.basename}, updating cache...`);
        
        try {
            // Force re-processing by removing from cache first
            this.frameCache.delete(file.path);
            
            // Re-extract frames
            await this.extractFramesFromFileWithCache(file);
            
            console.log(`✅ Successfully updated cache for ${file.basename}`);
        } catch (error) {
            console.error(`❌ Error handling file modification for ${file.path}:`, error);
        }
    }

    /**
     * Handle file deletion event with enhanced cleanup
     */
    handleFileDeletion(file: TFile): void {
        if (!file?.path?.endsWith('.excalidraw.md')) {
            return;
        }

        console.log(`🗑️ File deleted: ${file.basename}, cleaning up cache...`);
        
        try {
            // Remove from cache
            this.frameCache.delete(file.path);
            
            // Remove from frame index
            if (file.basename) {
                delete this.frameIndex[file.basename];
            }
            
            console.log(`✅ Successfully cleaned up cache for ${file.basename}`);
        } catch (error) {
            console.error(`❌ Error during file deletion cleanup for ${file.path}:`, error);
        }
    }

    /**
     * Handle file rename event with enhanced state management
     */
    async handleFileRename(file: TFile, oldPath: string): Promise<void> {
        if (!file?.path?.endsWith('.excalidraw.md') && !oldPath.endsWith('.excalidraw.md')) {
            return;
        }

        console.log(`📝 File renamed: ${oldPath} → ${file.path}`);
        
        try {
            // Get old basename
            const oldBasename = oldPath.split('/').pop()?.replace('.excalidraw.md', '') || '';
            
            // If old file was an Excalidraw file, clean it up
            if (oldPath.endsWith('.excalidraw.md')) {
                this.frameCache.delete(oldPath);
                if (oldBasename) {
                    delete this.frameIndex[oldBasename];
                }
                console.log(`🧹 Cleaned up old file: ${oldBasename}`);
            }
            
            // If new file is an Excalidraw file, process it
            if (file.path.endsWith('.excalidraw.md')) {
                await this.extractFramesFromFileWithCache(file);
                console.log(`✅ Processed new file: ${file.basename}`);
            }
            
            console.log(`✅ Successfully handled rename for ${file.basename}`);
        } catch (error) {
            console.error(`❌ Error handling file rename from ${oldPath} to ${file.path}:`, error);
        }
    }

    /**
     * Get cache statistics for debugging and monitoring
     */
    getCacheStats(): { 
        size: number; 
        files: string[];
        memoryUsage: string;
        frameCount: number;
    } {
        try {
            const totalFrames = Object.values(this.frameIndex).reduce((sum, frames) => sum + frames.length, 0);
            
            return {
                size: this.frameCache.size,
                files: Array.from(this.frameCache.keys()),
                memoryUsage: `~${Math.round(this.frameCache.size * 0.1)}KB`,
                frameCount: totalFrames
            };
        } catch (error) {
            console.error('❌ Error getting cache stats:', error);
            return {
                size: 0,
                files: [],
                memoryUsage: 'Unknown',
                frameCount: 0
            };
        }
    }

    /**
     * Clear all caches with enhanced cleanup
     */
    clearCache(): void {
        try {
            console.log('🧹 Clearing frame cache...');
            this.frameCache.clear();
            console.log('✅ Frame cache cleared successfully');
        } catch (error) {
            console.error('❌ Error clearing cache:', error);
        }
    }

    /**
     * Check if the indexer has been properly initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Get comprehensive diagnostic information
     */
    getDiagnostics(): {
        isInitialized: boolean;
        totalFiles: number;
        totalFrames: number;
        cacheSize: number;
        fileList: string[];
    } {
        try {
            const totalFrames = Object.values(this.frameIndex).reduce((sum, frames) => sum + frames.length, 0);
            
            return {
                isInitialized: this.isInitialized,
                totalFiles: Object.keys(this.frameIndex).length,
                totalFrames,
                cacheSize: this.frameCache.size,
                fileList: Object.keys(this.frameIndex)
            };
        } catch (error) {
            console.error('❌ Error getting diagnostics:', error);
            return {
                isInitialized: false,
                totalFiles: 0,
                totalFrames: 0,
                cacheSize: 0,
                fileList: []
            };
        }
    }
}
