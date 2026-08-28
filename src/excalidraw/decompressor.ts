import * as LZString from "lz-string";

/**
 * Decompresses Excalidraw's compressed drawing data.
 *
 * Excalidraw stores drawing JSON compressed with lz-string, but the exact
 * encoding (base64 vs UTF-16 vs URI-component) has varied across versions,
 * so each candidate method is tried in turn.
 */
export class ExcalidrawDecompressor {
	static decompress(compressedData: string): unknown {
		const cleanData = compressedData.replace(/\s/g, "");

		const methods = [
			() => LZString.decompressFromBase64(cleanData),
			() => LZString.decompressFromUTF16(cleanData),
			() => LZString.decompressFromEncodedURIComponent(cleanData),
			() => LZString.decompress(cleanData),
		];

		for (const method of methods) {
			try {
				const decompressed = method();
				if (decompressed && decompressed.length > 50) {
					return JSON.parse(decompressed);
				}
			} catch {
				continue;
			}
		}

		throw new Error("Failed to decompress Excalidraw data: no decompression method succeeded");
	}
}
