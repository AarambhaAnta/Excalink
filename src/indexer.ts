import { TFile, Vault } from "obsidian";
import { ExcalidrawDecompressor } from "excalidraw/decompressor";
import { DrawingTarget, parseDrawingTargets } from "excalidraw/parser";

interface CacheEntry {
	mtime: number;
	targets: DrawingTarget[];
}

interface JsonBlock {
	raw: string;
	compressed: boolean;
}

/**
 * Scans the vault's `.excalidraw.md` files for linkable Frames and Groups,
 * keeping a content-hash-free (mtime based) cache so unchanged files aren't
 * re-parsed, and staying in sync with vault file events.
 */
export class DrawingIndexer {
	private vault: Vault;
	private index: Record<string, DrawingTarget[]> = {};
	private cache: Map<string, CacheEntry> = new Map();
	private ready = false;

	constructor(vault: Vault) {
		this.vault = vault;
	}

	async scanAll(): Promise<void> {
		const files = this.vault
			.getMarkdownFiles()
			.filter((file) => file.path.endsWith(".excalidraw.md"));

		this.index = {};
		for (const file of files) {
			await this.indexFile(file);
		}
		this.ready = true;
	}

	async rescan(): Promise<{ files: number; targets: number }> {
		this.cache.clear();
		await this.scanAll();
		return {
			files: Object.keys(this.index).length,
			targets: Object.values(this.index).reduce((sum, t) => sum + t.length, 0),
		};
	}

	getTargetsForFile(basename: string): DrawingTarget[] {
		return this.index[basename] ?? [];
	}

	isReady(): boolean {
		return this.ready;
	}

	clearCache(): void {
		this.cache.clear();
	}

	async handleFileModification(file: TFile): Promise<void> {
		if (!file.path.endsWith(".excalidraw.md")) return;
		this.cache.delete(file.path);
		await this.indexFile(file);
	}

	handleFileDeletion(file: TFile): void {
		if (!file.path.endsWith(".excalidraw.md")) return;
		this.cache.delete(file.path);
		delete this.index[file.basename];
	}

	async handleFileRename(file: TFile, oldPath: string): Promise<void> {
		if (oldPath.endsWith(".excalidraw.md")) {
			this.cache.delete(oldPath);
			const oldBasename = oldPath.split("/").pop()?.replace(".excalidraw.md", "");
			if (oldBasename) delete this.index[oldBasename];
		}
		if (file.path.endsWith(".excalidraw.md")) {
			await this.indexFile(file);
		}
	}

	private async indexFile(file: TFile): Promise<void> {
		const cached = this.cache.get(file.path);
		if (cached && cached.mtime === file.stat.mtime) {
			if (cached.targets.length > 0) {
				this.index[file.basename] = cached.targets;
			}
			return;
		}

		let content: string;
		try {
			content = await this.vault.read(file);
		} catch (error) {
			console.error(`Excalink: failed to read ${file.path}`, error);
			return;
		}

		const targets = this.parseFileContent(content, file.path);
		this.cache.set(file.path, { mtime: file.stat.mtime, targets });
		if (targets.length > 0) {
			this.index[file.basename] = targets;
		}
	}

	private parseFileContent(content: string, path: string): DrawingTarget[] {
		const block = this.extractJsonBlock(content);
		if (!block) return [];

		const data = this.parseJsonBlock(block, path);
		return data ? parseDrawingTargets(data) : [];
	}

	private parseJsonBlock(block: JsonBlock, path: string): unknown {
		const primary = block.compressed
			? () => ExcalidrawDecompressor.decompress(block.raw)
			: () => JSON.parse(block.raw);
		const fallback = block.compressed
			? () => JSON.parse(block.raw)
			: () => ExcalidrawDecompressor.decompress(block.raw);

		try {
			return primary();
		} catch {
			try {
				return fallback();
			} catch {
				console.error(`Excalink: could not parse Excalidraw data in ${path}`);
				return null;
			}
		}
	}

	private extractJsonBlock(content: string): JsonBlock | null {
		const compressedMatch = content.match(/```compressed-json\n([\s\S]*?)\n```/);
		if (compressedMatch) {
			return { raw: compressedMatch[1], compressed: true };
		}

		const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
		if (jsonMatch) {
			return { raw: jsonMatch[1], compressed: false };
		}

		return null;
	}
}
