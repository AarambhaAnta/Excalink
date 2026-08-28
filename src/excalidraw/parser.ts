/**
 * Extracts linkable "drawing targets" — named Frames and Groups — from
 * parsed Excalidraw element data, along with enough raw geometry for each
 * to be rendered as a small thumbnail preview.
 */

export interface RenderableElement {
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	angle: number;
	/** Relative [dx, dy] points, for line/arrow/draw elements. */
	points?: [number, number][];
	strokeColor?: string;
	backgroundColor?: string;
}

export interface DrawingTarget {
	type: "frame" | "group";
	/** Display name shown in the suggestion picker. */
	name: string;
	/** Value inserted after `frame=` / `group=` in the resulting link. */
	refValue: string;
	/** Position in the elements array; used as a recency tiebreaker/fallback. */
	index: number;
	/** Excalidraw's last-modified timestamp (epoch ms), when present. */
	updated?: number;
	/** Geometry for rendering a thumbnail preview; empty if nothing renderable. */
	elements: RenderableElement[];
}

interface GroupMember {
	id: string;
	index: number;
	type: string;
	text?: string;
	updated?: number;
	renderable?: RenderableElement;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const result: string[] = [];
	for (const item of value) {
		if (typeof item !== "string") return undefined;
		result.push(item);
	}
	return result;
}

function asTimestamp(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

function asPointArray(value: unknown): [number, number][] | undefined {
	if (!Array.isArray(value)) return undefined;
	const result: [number, number][] = [];
	for (const point of value) {
		if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number") {
			return undefined;
		}
		result.push([point[0], point[1]]);
	}
	return result;
}

function toRenderableElement(element: Record<string, unknown>): RenderableElement | undefined {
	const { x, y, width, height } = element;
	if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number") {
		return undefined;
	}

	return {
		type: typeof element.type === "string" ? element.type : "",
		x,
		y,
		width,
		height,
		angle: typeof element.angle === "number" ? element.angle : 0,
		points: asPointArray(element.points),
		strokeColor: typeof element.strokeColor === "string" ? element.strokeColor : undefined,
		backgroundColor: typeof element.backgroundColor === "string" ? element.backgroundColor : undefined,
	};
}

function deriveGroupLabel(text: string): string {
	const line = text
		.split("\n")
		.map((l) => l.trim())
		.find((l) => l.length > 0) ?? text.trim();
	return line.length > 60 ? `${line.slice(0, 57)}...` : line;
}

export function parseDrawingTargets(excalidrawData: unknown): DrawingTarget[] {
	if (!isRecord(excalidrawData) || !Array.isArray(excalidrawData.elements)) {
		return [];
	}

	const elements: unknown[] = excalidrawData.elements;
	const targets: DrawingTarget[] = [];

	// Frames: named directly by the author in Excalidraw. Keyed by the frame's
	// own element id so member elements (linked via `frameId`) can be collected.
	const frames = new Map<
		string,
		{ name: string; index: number; updated?: number; elements: RenderableElement[] }
	>();

	elements.forEach((element, index) => {
		if (!isRecord(element) || element.type !== "frame") return;
		if (typeof element.id !== "string" || typeof element.name !== "string") return;

		const name = element.name.trim();
		if (!name) return;

		frames.set(element.id, { name, index, updated: asTimestamp(element.updated), elements: [] });
	});

	// Groups: keyed by the outermost groupId (groupIds is innermost -> outermost).
	const groupOrder: string[] = [];
	const groups = new Map<string, GroupMember[]>();

	elements.forEach((element, index) => {
		if (!isRecord(element)) return;

		if (typeof element.frameId === "string") {
			const frame = frames.get(element.frameId);
			const renderable = toRenderableElement(element);
			if (frame && renderable) frame.elements.push(renderable);
		}

		const groupIds = asStringArray(element.groupIds);
		if (!groupIds || groupIds.length === 0) return;

		const outerGroupId = groupIds[groupIds.length - 1];
		if (!outerGroupId) return;

		if (!groups.has(outerGroupId)) {
			groups.set(outerGroupId, []);
			groupOrder.push(outerGroupId);
		}
		groups.get(outerGroupId)?.push({
			id: typeof element.id === "string" ? element.id : `element_${index}`,
			index,
			type: typeof element.type === "string" ? element.type : "",
			text: typeof element.text === "string" ? element.text : undefined,
			updated: asTimestamp(element.updated),
			renderable: toRenderableElement(element),
		});
	});

	for (const [, frame] of frames) {
		targets.push({
			type: "frame",
			name: frame.name,
			refValue: frame.name,
			index: frame.index,
			updated: frame.updated,
			elements: frame.elements,
		});
	}

	let unnamedGroupCount = 0;
	for (const groupId of groupOrder) {
		const members = groups.get(groupId);
		if (!members || members.length === 0) continue;

		const refValue = members[0].id;
		const index = Math.max(...members.map((m) => m.index));
		const timestamps = members
			.map((m) => m.updated)
			.filter((u): u is number => typeof u === "number");
		const updated = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
		const labeledMember = members.find((m) => m.type === "text" && m.text?.trim());

		const name = labeledMember?.text
			? deriveGroupLabel(labeledMember.text)
			: `Group ${++unnamedGroupCount}`;

		const memberElements = members
			.map((m) => m.renderable)
			.filter((r): r is RenderableElement => r !== undefined);

		targets.push({ type: "group", name, refValue, index, updated, elements: memberElements });
	}

	return targets;
}
