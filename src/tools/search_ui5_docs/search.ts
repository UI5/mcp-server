import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import embedding from "./embedding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const embeddingsDir = path.join(__dirname, "../../../resources/embeddings");

interface EmbeddedChunk {
	source: string;
	summary: string;
	kind?: "code" | "documentation";
	code?: string;
	content?: string;
	embedding: Float32Array;
}

interface EmbeddingsMetadata {
	id: string;
	dimensions: number;
	count: number;
}

interface EmbeddingsWrapper extends EmbeddingsMetadata {
	embeddings: EmbeddedChunk[];
}

let wrapper: EmbeddingsWrapper[] | null = null;

async function loadEmbeddings(): Promise<EmbeddingsWrapper[]> {
	if (!wrapper) {
		const files = await fs.readdir(embeddingsDir);
		const metaFiles = files.filter((f) => f.endsWith(".meta.json"));

		if (metaFiles.length === 0) {
			throw new Error(`Embeddings not found in: ${embeddingsDir}`);
		}

		wrapper = [];
		for (const metaFile of metaFiles) {
			const baseName = metaFile.replace(".meta.json", "");
			const basePath = path.join(embeddingsDir, baseName);

			const metadata = JSON.parse(
				await fs.readFile(`${basePath}.meta.json`, "utf-8")
			) as EmbeddingsMetadata;
			const jsonData = JSON.parse(
				await fs.readFile(`${basePath}.json`, "utf-8")
			) as Omit<EmbeddedChunk, "embedding">[];
			const binBuffer = await fs.readFile(`${basePath}.bin`);
			const floats = new Float32Array(binBuffer.buffer, binBuffer.byteOffset, binBuffer.byteLength / 4);

			const dim = metadata.dimensions;
			const embeddings: EmbeddedChunk[] = jsonData.map((chunk, i: number) => ({
				...chunk,
				embedding: floats.slice(i * dim, (i + 1) * dim),
			}));

			wrapper.push({...metadata, embeddings});
		}
	}
	return wrapper;
}

function similarity(a: Float32Array, b: Float32Array): number {
	let dot = 0;
	for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
	return dot;
}

export interface SearchResult {
	score: number;
	source: string;
	summary: string;
	kind: "code" | "documentation";
	code?: string;
	content?: string;
}

export async function searchDocs(query: string, limit = 5): Promise<SearchResult[]> {
	const embeddingsWrapper = await loadEmbeddings();
	const queryVec = await embedding(query);

	const scored: SearchResult[] = [];
	for (const w of embeddingsWrapper) {
		for (const chunk of w.embeddings) {
			scored.push({
				score: similarity(queryVec, chunk.embedding),
				source: chunk.source,
				summary: chunk.summary,
				kind: chunk.kind ?? "code",
				code: chunk.code,
				content: chunk.content,
			});
		}
	}

	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, limit);
}
