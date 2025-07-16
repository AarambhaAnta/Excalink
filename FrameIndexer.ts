import { TFile, Vault } from "obsidian";

export interface FrameInfo{
    name: string;
    id: string;
}

export interface FileFrameMap {
    [fileName: string]: FrameInfo[];
}

export class FrameIndexer{
    private vault: Vault;
    private frameIndex: FileFrameMap = {};

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async scanAllExcalidrawFiles(): Promise<void>{
        console.log('🔍 Starting Excalidraw file scan...');

        const markdownFiles = this.vault.getMarkdownFiles();
        const excalidrawFiles = markdownFiles.filter(file => file.path.endsWith('.excalidraw.md'));

        console.log(`Found ${excalidrawFiles.length} Excalidraw files`);

        for (const file of excalidrawFiles) {
            await this.extractFramesFromFile(file);
        }

        console.log('📜 Final frame index: ', this.frameIndex);
    }

    private async extractFramesFromFile(file: TFile): Promise<void> {
        try {
            const content = await this.vault.read(file);
            const frames = this.parseFramesFromContent(content);

            if (frames.length > 0) {
                this.frameIndex[file.basename] = frames;
                console.log(`📃 ${file.basename}: [${frames.map((frame: any) => frame.name).join(', ')}]`);
            }
        } catch (error) {
            console.error(`Error processing ${file.path}: `, error);
        }
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

            if (isCompressed) {
                console.log('🗜️ Compressed format detected - need to decompress first');
                console.log('💡 Tip: Use "Decompress current Excalidraw file" command in Obsidian');
                return [];
            }

            console.log('✅ JSON block found, parsing...');
            const excalidrawData = JSON.parse(jsonMatch[1]);
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
}