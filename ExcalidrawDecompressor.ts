import * as LZString from "lz-string";
/**
 * ExcalidrawDecompressor - Handles decompression of Excalidraw's compressed data
 * Uses the official lz-string library that Excalidraw uses
 */
export class ExcalidrawDecompressor{
    /**
     * Decompresses Excalidraw compressed data using lz-string
     * @param compressedData - The compressed string from Excalidraw
     * @returns Decompressed JSON object
     */
    static decompress(compressedData: string): any{
        try {
            console.log('🗜️ Starting lz-string decompression...');

            // Clean the input data - remove all whitespace including newlines
            const cleanData = compressedData.replace(/\s/g, '');
            console.log(`📏 Compressed data length: ${cleanData.length} characters`);

            // Try Base64 decompression first (confirmed working method)
            try {
                console.log('🔄 Trying decompressFromBase64 (primary method)...');
                const decompressed = LZString.decompressFromBase64(cleanData);

                if (decompressed && decompressed.length > 50) {
                    console.log(`✅ Sucess with decompressFromBase64!`);
                    console.log(`📏 Decompressed data length: ${decompressed.length} characters`);

                    const parsed = JSON.parse(decompressed);
                    console.log('✅ Sucessfully parsed decompressed JSON');
                    return parsed;
                }
            } catch (error) {
                console.log(`❌ Base64 decompression failed: ${error.message}`);
            }
            
            // Fallback methods if Base64 fails
            console.log('🔄 Trying fallback decompression methods...');
            const fallbackMethods = [
                () => LZString.decompressFromUTF16(cleanData),
                () => LZString.decompressFromEncodedURIComponent(cleanData),
                () => LZString.decompress(cleanData)
            ];

            const methodNames = [
                'decompressFromUTF16',
                'decompressFromEncodedURIComponent',
                'decompress (direct)'
            ];

            for (let i = 0; i < fallbackMethods.length; i++){
                try {
                    console.log(`🔄 Trying ${methodNames[i]}...`);
                    const decompressed = fallbackMethods[i]();

                    if (decompressed && decompressed.length > 50) {
                        console.log(`✅ Sucess with ${methodNames[i]}!`);
                        console.log(`📏 Decompressed data length: ${decompressed.length} characters`);

                        const parsed = JSON.parse(decompressed);
                        console.log('✅ Sucessfully parsed decompressed JSON');
                        return parsed;
                    }
                } catch (error) {
                    console.log(`❌ ${methodNames[i]} failed: `, error.message);
                    continue;
                }
            }

            throw new Error('All decompression methods failed');
        } catch (error) {
            console.error('❌ Decompression failed: ', error);
            throw new Error(`Failed to decompress Excalidraw data: ${error.message}`);
        }
    }

    /**
     * Check if data appears to be compressed (for debugging)
     */
    static isValidCompressedData(data: string): boolean{
        const cleanData = data.replace(/\s/g, '');
        try {
            const decompressed = LZString.decompressFromBase64(cleanData);

            if (decompressed && decompressed.length > 50) {
                JSON.parse(decompressed);
                return true;
            }
        } catch {
            const methods = [
                () => LZString.decompressFromUTF16(cleanData),
                () => LZString.decompressFromEncodedURIComponent(cleanData),
                () => LZString.decompress(cleanData)
            ];
    
            for (const method of methods) {
                try {
                    const result = method();
                    if (result && result.length > 50) {
                        JSON.parse(result);
                        return true;
                    }
                } catch {
                    continue;
                }
            }
        }
        return false;
    }

    /**
     * Get compression info for debugging
     */
    static getCompressionInfo(data: string): object {
        const cleanData = data.trim();
        return {
            originalLength: cleanData.length,
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(cleanData),
            startWithAlphaNumeric: /^[A-Za-z0-9]/.test(cleanData),
            canDecompress: this.isValidCompressedData(cleanData),
            firstChars: cleanData.substring(0, 50),
            lastChars: cleanData.substring(Math.max(cleanData.length - 20))
        };
    }
}