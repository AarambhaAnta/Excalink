import { RenderableElement } from "../excalidraw/parser";

const SVG_NS = "http://www.w3.org/2000/svg";
const PADDING_RATIO = 0.08;
const LINE_TYPES = new Set(["arrow", "line", "draw", "freedraw"]);

function boundingBox(elements: RenderableElement[]): { x: number; y: number; width: number; height: number } | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const el of elements) {
		minX = Math.min(minX, el.x);
		minY = Math.min(minY, el.y);
		maxX = Math.max(maxX, el.x + el.width);
		maxY = Math.max(maxY, el.y + el.height);
	}

	const width = maxX - minX;
	const height = maxY - minY;
	if (!(width > 0) || !(height > 0)) return null;

	const padding = Math.max(width, height) * PADDING_RATIO;
	return { x: minX - padding, y: minY - padding, width: width + padding * 2, height: height + padding * 2 };
}

function createShape(doc: Document, el: RenderableElement): SVGElement | null {
	const cx = el.x + el.width / 2;
	const cy = el.y + el.height / 2;

	let shape: SVGElement;

	if (el.type === "rectangle") {
		shape = doc.createElementNS(SVG_NS, "rect");
		shape.setAttribute("x", String(el.x));
		shape.setAttribute("y", String(el.y));
		shape.setAttribute("width", String(el.width));
		shape.setAttribute("height", String(el.height));
	} else if (el.type === "ellipse") {
		shape = doc.createElementNS(SVG_NS, "ellipse");
		shape.setAttribute("cx", String(cx));
		shape.setAttribute("cy", String(cy));
		shape.setAttribute("rx", String(el.width / 2));
		shape.setAttribute("ry", String(el.height / 2));
	} else if (el.type === "diamond") {
		const points = [
			[cx, el.y],
			[el.x + el.width, cy],
			[cx, el.y + el.height],
			[el.x, cy],
		]
			.map(([x, y]) => `${x},${y}`)
			.join(" ");
		shape = doc.createElementNS(SVG_NS, "polygon");
		shape.setAttribute("points", points);
	} else if (LINE_TYPES.has(el.type)) {
		if (!el.points || el.points.length < 2) return null;
		const points = el.points.map(([dx, dy]) => `${el.x + dx},${el.y + dy}`).join(" ");
		shape = doc.createElementNS(SVG_NS, "polyline");
		shape.setAttribute("points", points);
		shape.setAttribute("fill", "none");
	} else {
		return null;
	}

	if (el.angle) {
		shape.setAttribute("transform", `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})`);
	}
	if (!LINE_TYPES.has(el.type)) {
		const fill = el.backgroundColor && el.backgroundColor !== "transparent" ? el.backgroundColor : "none";
		shape.setAttribute("fill", fill);
	}
	shape.setAttribute("stroke", el.strokeColor ?? "currentColor");
	shape.setAttribute("vector-effect", "non-scaling-stroke");

	return shape;
}

/** Renders a small SVG preview of the target's shapes into `container`. Returns false if there was nothing to draw. */
export function renderThumbnail(container: HTMLElement, elements: RenderableElement[]): boolean {
	const box = boundingBox(elements);
	if (!box) return false;

	const doc = container.ownerDocument;
	const svg = doc.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
	svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
	svg.classList.add("excalink-thumbnail-svg");

	let shapeCount = 0;
	for (const el of elements) {
		const shape = createShape(doc, el);
		if (shape) {
			svg.appendChild(shape);
			shapeCount++;
		}
	}

	if (shapeCount === 0) return false;

	container.appendChild(svg);
	return true;
}
