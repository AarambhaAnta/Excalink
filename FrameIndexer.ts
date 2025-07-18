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

export class FrameIndexer{
    private vault: Vault;
    private frameIndex: FileFrameMap = {};
    
    // Day 5: Performance caching system
    private frameCache: Map<string, CacheEntry> = new Map();
    private isInitialized: boolean = false;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async scanAllExcalidrawFiles(): Promise<void>{
        console.log('🔍 Starting Excalidraw file scan with caching...');

        const markdownFiles = this.vault.getMarkdownFiles();
        const excalidrawFiles = markdownFiles.filter(file => file.path.endsWith('.excalidraw.md'));

        console.log(`Found ${excalidrawFiles.length} Excalidraw files`);

        // Clear the frame index but keep cache for performance
        this.frameIndex = {};
        
        let cacheHits = 0;
        let cacheMisses = 0;

        for (const file of excalidrawFiles) {
            const wasFromCache = await this.extractFramesFromFileWithCache(file);
            if (wasFromCache) {
                cacheHits++;
            } else {
                cacheMisses++;
            }
        }

        console.log(`📊 Cache performance: ${cacheHits} hits, ${cacheMisses} misses`);
        console.log('📜 Final frame index: ', this.frameIndex);
        
        this.isInitialized = true;
    }

    /**
     * Extract frames from file with caching support (Day 5)
     * Returns true if loaded from cache, false if file was processed
     */
    private async extractFramesFromFileWithCache(file: TFile): Promise<boolean> {
        try {
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
                }
                
                return true; // From cache
            }
            
            console.log(`🔄 Cache miss for ${file.basename}, processing file...`);
            
            // Read and process the file
            const content = await this.vault.read(file);
            const frames = this.parseFramesFromContent(content);
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
            }
            
            return false; // Not from cache
            
        } catch (error) {
            console.error(`Error processing ${file.path}: `, error);
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

    private parseFramesFromContent(content: string): FrameInfo[] {
        try {
            let jsonMatch = content.match(/```compressed-json\n([\s\S]*?)\n```/);
            let isCompressed = true;

            if (!jsonMatch) {
                jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                isCompressed = false;
            }

            if (!jsonMatch) {
                console.log(`❌ No JSON or compressed-json block found`);
                return [];
            }

            console.log(`✅ ${isCompressed ? 'Compressed' : 'Regular'} JSON block found`);

            let excalidrawData;

            if (isCompressed) {
                console.log('🗜️ Compressed format detected - need to decompress first');
                try {
                    excalidrawData = ExcalidrawDecompressor.decompress(jsonMatch[1]);
                    console.log('✅ Successfully decompressed data');
                } catch (error) {
                    console.log('❌ Decompression failed: ', error);

                    // Show compression info for debugging
                    const info = ExcalidrawDecompressor.getCompressionInfo(jsonMatch[1]);
                    console.log('🔍 Compression info: ', info);

                    console.log('💡 Tip: Use "Decompress current Excalidraw file" command in Obsidian');
                    return [];
                }
            } else {
                console.log('✅ Parsing regular JSON...');
                excalidrawData = JSON.parse(jsonMatch[1]);
            }

            const elements = excalidrawData.elements || [];

            console.log(`📊 Found ${elements.length} total elements`);
            const frames = elements.filter((element: any) => element.type === 'frame');
            console.log(`🖼️ Found ${frames.length} frame element`);
            const namedFrames = frames.filter((frame: any) => frame.name);
            console.log(`📝 Found ${namedFrames.length} named frames`);

            return namedFrames.map((frame: any) => ({ name: frame.name, id: frame.id }));
        } catch (error) {
            console.error('Error parsing Excalidraw JSON:', error);
            return [];
        }
    }

    getFrameIndex(): FileFrameMap{
        return this.frameIndex;
    }

    getFramesForFile(fileName: string): FrameInfo[] {
        return this.frameIndex[fileName] || [];
    }

    /**
     * Handle file modification event (Day 5)
     * Updates cache and frame index when an Excalidraw file changes
     */
    async handleFileModification(file: TFile): Promise<void> {
        if (!file.path.endsWith('.excalidraw.md')) {
            return; // Not an Excalidraw file
        }

        console.log(`🔄 File modified: ${file.basename}, updating cache...`);
        
        try {
            // Remove old cache entry
            this.frameCache.delete(file.path);
            
            // Remove from frame index
            delete this.frameIndex[file.basename];
            
            // Re-process the file
            await this.extractFramesFromFileWithCache(file);
            
            console.log(`✅ Successfully updated cache for ${file.basename}`);
            
        } catch (error) {
            console.error(`❌ Error updating cache for ${file.path}:`, error);
        }
    }

    /**
     * Handle file deletion event (Day 5)
     * Removes file from cache and frame index
     */
    handleFileDeletion(file: TFile): void {
        if (!file.path.endsWith('.excalidraw.md')) {
            return; // Not an Excalidraw file
        }

        console.log(`🗑️ File deleted: ${file.basename}, cleaning up cache...`);
        
        // Remove from cache
        this.frameCache.delete(file.path);
        
        // Remove from frame index
        delete this.frameIndex[file.basename];
        
        console.log(`✅ Successfully cleaned up cache for ${file.basename}`);
    }

    /**
     * Handle file rename event (Day 5)
     * Updates cache keys when a file is renamed
     */
    async handleFileRename(file: TFile, oldPath: string): Promise<void> {
        if (!file.path.endsWith('.excalidraw.md') && !oldPath.endsWith('.excalidraw.md')) {
            return; // Not an Excalidraw file
        }

        console.log(`📝 File renamed: ${oldPath} → ${file.path}`);
        
        // Get old basename
        const oldBasename = oldPath.split('/').pop()?.replace('.excalidraw.md', '') || '';
        
        // If old file was an Excalidraw file, clean it up
        if (oldPath.endsWith('.excalidraw.md')) {
            this.frameCache.delete(oldPath);
            delete this.frameIndex[oldBasename];
        }
        
        // If new file is an Excalidraw file, process it
        if (file.path.endsWith('.excalidraw.md')) {
            await this.extractFramesFromFileWithCache(file);
        }
        
        console.log(`✅ Successfully handled rename for ${file.basename}`);
    }

    /**
     * Get cache statistics for debugging (Day 5)
     */
    getCacheStats(): { size: number, files: string[] } {
        return {
            size: this.frameCache.size,
            files: Array.from(this.frameCache.keys())
        };
    }

    /**
     * Clear all caches (for debugging or manual refresh)
     */
    clearCache(): void {
        console.log('🧹 Clearing frame cache...');
        this.frameCache.clear();
        this.frameIndex = {};
        this.isInitialized = false;
        console.log('✅ Cache cleared successfully');
    }

    /**
     * Check if the indexer has been initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}