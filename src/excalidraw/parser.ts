/**
 * Extracts linkable "drawing targets" — named Frames and Groups — from
 * parsed Excalidraw element data.
 */

export interface DrawingTarget {
	type: "frame" | "group";
	/** Display name shown in the suggestion picker. */
	name: string;
	/** Value inserted after `frame=` / `group=` in the resulting link. */
	refValue: string;
	/** Position used for newest-first ordering. */
	index: number;
}

interface GroupMember {
	id: string;
	index: number;
	type: string;
	text?: string;
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

	// Frames: named directly by the author in Excalidraw.
	elements.forEach((element, index) => {
		if (!isRecord(element) || element.type !== "frame") return;
		if (typeof element.name !== "string") return;

		const name = element.name.trim();
		if (name) {
			targets.push({ type: "frame", name, refValue: name, index });
		}
	});

	// Groups: keyed by the outermost groupId (groupIds is innermost -> outermost).
	const groupOrder: string[] = [];
	const groups = new Map<string, GroupMember[]>();

	elements.forEach((element, index) => {
		if (!isRecord(element)) return;
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
		});
	});

	let unnamedGroupCount = 0;
	for (const groupId of groupOrder) {
		const members = groups.get(groupId);
		if (!members || members.length === 0) continue;

		const refValue = members[0].id;
		const index = Math.max(...members.map((m) => m.index));
		const labeledMember = members.find((m) => m.type === "text" && m.text?.trim());

		const name = labeledMember?.text
			? deriveGroupLabel(labeledMember.text)
			: `Group ${++unnamedGroupCount}`;

		targets.push({ type: "group", name, refValue, index });
	}

	return targets;
}
