import fs from "fs/promises";
import path from "path";
import os from "os";
import * as ort from "onnxruntime-web";

ort.env.debug = false;
ort.env.logLevel = "error";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const MODEL_FILES = ["onnx/model.onnx", "tokenizer.json"];

function getModelDir(): string {
	const home = os.homedir();
	const platform = os.platform();
	const base = platform === "win32" ?
			(process.env.LOCALAPPDATA ?? process.env.APPDATA ?? path.join(home, "AppData", "Local")) :
			(process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share"));
	return path.join(base, "semantic-search", "models", MODEL_NAME.replace("/", "_"));
}

async function fileExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

async function downloadModel(modelDir: string): Promise<void> {
	await fs.mkdir(modelDir, {recursive: true});

	for (const file of MODEL_FILES) {
		const filePath = path.join(modelDir, path.basename(file));
		if (await fileExists(filePath)) continue;

		const url = `https://huggingface.co/${MODEL_NAME}/resolve/main/${file}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

		if (file.endsWith(".onnx")) {
			await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
		} else {
			await fs.writeFile(filePath, JSON.stringify(await res.json(), null, 2));
		}
	}
}

interface TokenizerJson {
	model: {
		vocab: Record<string, number>;
	};
}

async function loadModel(modelDir: string): Promise<{session: ort.InferenceSession; vocab: Map<string, number>}> {
	const modelBuffer = await fs.readFile(path.join(modelDir, "model.onnx"));
	const session = await ort.InferenceSession.create(modelBuffer);

	const tokenizer = JSON.parse(await fs.readFile(path.join(modelDir, "tokenizer.json"), "utf-8")) as TokenizerJson;
	const vocab = new Map<string, number>();
	for (const [token, id] of Object.entries(tokenizer.model.vocab)) {
		if (typeof id === "number") vocab.set(token, id);
	}

	return {session, vocab};
}

function normalizeText(text: string): string {
	// eslint-disable-next-line no-control-regex
	return text.normalize("NFD").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/\s+/g, " ").trim();
}

function isPunctuation(char: string): boolean {
	const cp = char.codePointAt(0)!;
	if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
		return true;
	}
	return /\p{P}/u.test(char);
}

function preTokenize(text: string): string[] {
	const tokens: string[] = [];
	let current = "";

	for (const char of text) {
		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
		} else if (isPunctuation(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			tokens.push(char);
		} else {
			current += char;
		}
	}
	if (current) tokens.push(current);
	return tokens;
}

function wordPieceTokenize(token: string, vocab: Map<string, number>): string[] {
	if (token.length > 200) return ["[UNK]"];

	const output: string[] = [];
	let start = 0;

	while (start < token.length) {
		let end = token.length;
		let found: string | null = null;

		while (start < end) {
			let sub = token.substring(start, end);
			if (start > 0) sub = "##" + sub;
			if (vocab.has(sub)) {
				found = sub;
				break;
			}
			end--;
		}

		if (!found) return ["[UNK]"];
		output.push(found);
		start = end;
	}

	return output;
}

function tokenize(text: string, vocab: Map<string, number>): {tokens: string[]; ids: number[]}[] {
	const CLS = vocab.get("[CLS]") ?? 101;
	const SEP = vocab.get("[SEP]") ?? 102;
	const UNK = vocab.get("[UNK]") ?? 100;

	const normalized = normalizeText(text);
	const preTokens = preTokenize(normalized);

	const tokens = ["[CLS]"];
	const ids = [CLS];

	for (const pt of preTokens) {
		for (const wp of wordPieceTokenize(pt.toLowerCase(), vocab)) {
			tokens.push(wp);
			ids.push(vocab.get(wp) ?? UNK);
		}
	}

	tokens.push("[SEP]");
	ids.push(SEP);

	if (tokens.length <= 512) return [{tokens, ids}];

	const maxContent = 510;
	const chunks: {tokens: string[]; ids: number[]}[] = [];
	const content = tokens.slice(1, -1);
	const contentIds = ids.slice(1, -1);

	for (let i = 0; i < content.length; i += maxContent) {
		chunks.push({
			tokens: ["[CLS]", ...content.slice(i, i + maxContent), "[SEP]"],
			ids: [CLS, ...contentIds.slice(i, i + maxContent), SEP],
		});
	}

	return chunks;
}

async function runInference(chunks: {ids: number[]}[], session: ort.InferenceSession): Promise<Float32Array> {
	const embeddings: Float32Array[] = [];

	for (const chunk of chunks) {
		const inputIds = new BigInt64Array(chunk.ids.map((i) => BigInt(i)));
		const attentionMask = new BigInt64Array(chunk.ids.length).fill(BigInt(1));
		const tokenTypeIds = new BigInt64Array(chunk.ids.length).fill(BigInt(0));

		const results = await session.run({
			input_ids: new ort.Tensor("int64", inputIds, [1, chunk.ids.length]),
			attention_mask: new ort.Tensor("int64", attentionMask, [1, chunk.ids.length]),
			token_type_ids: new ort.Tensor("int64", tokenTypeIds, [1, chunk.ids.length]),
		});

		const output = results.last_hidden_state;
		const [, seqLen, hiddenSize] = output.dims;
		const data = output.data as Float32Array;

		const pooled = new Float32Array(hiddenSize);
		for (let i = 0; i < hiddenSize; i++) {
			let sum = 0;
			for (let j = 0; j < seqLen; j++) sum += data[j * hiddenSize + i];
			pooled[i] = sum / seqLen;
		}
		embeddings.push(pooled);
	}

	if (embeddings.length === 1) return normalize(embeddings[0]);

	const avg = new Float32Array(embeddings[0].length);
	for (let i = 0; i < avg.length; i++) {
		for (const e of embeddings) avg[i] += e[i];
		avg[i] /= embeddings.length;
	}
	return normalize(avg);
}

function normalize(v: Float32Array): Float32Array {
	let norm = 0;
	for (const val of v) norm += val * val;
	norm = Math.sqrt(norm);

	const result = new Float32Array(v.length);
	let i = 0;
	for (const val of v) result[i++] = val / norm;
	return result;
}

let session: ort.InferenceSession | null = null;
let vocab: Map<string, number> | null = null;
let initPromise: Promise<void> | null = null;

export default async function embedding(text: string): Promise<Float32Array> {
	initPromise ??= (async () => {
		const modelDir = getModelDir();
		await downloadModel(modelDir);
		const loaded = await loadModel(modelDir);
		session = loaded.session;
		vocab = loaded.vocab;
	})();

	await initPromise;

	const chunks = tokenize(text, vocab!);
	return runInference(chunks, session!);
}
