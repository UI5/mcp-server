import fs from "fs/promises";
import {constants} from "fs";
import path from "path";
import os from "os";
import * as ort from "onnxruntime-web";

ort.env.debug = false;
ort.env.logLevel = "error";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const MODEL_FILES = ["onnx/model.onnx", "tokenizer.json", "tokenizer_config.json"];

// Platform-specific data directory
function getDataDir(appName = "semantic-search"): string {
	const home = os.homedir();
	const platform = os.platform();

	const base = platform === "win32" ?
			(process.env.LOCALAPPDATA ?? process.env.APPDATA ?? path.join(home, "AppData", "Local")) :
			(process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share"));

	return path.join(base, appName);
}

const MODEL_DIR = path.join(getDataDir(), "models", MODEL_NAME.replace("/", "_"));

// File operations
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to download ${url}, status ${res.status}`);

	if (url.endsWith(".onnx")) {
		const arrayBuffer = await res.arrayBuffer();
		await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
	} else if (url.endsWith(".json")) {
		const json = await res.json() as unknown;
		await fs.writeFile(outputPath, JSON.stringify(json, null, 2));
	} else {
		const text = await res.text();
		await fs.writeFile(outputPath, text);
	}
}

async function downloadModelIfNeeded(): Promise<void> {
	try {
		await fs.access(MODEL_DIR);
	} catch {
		await fs.mkdir(MODEL_DIR, {recursive: true});
	}

	for (const file of MODEL_FILES) {
		const filePath = path.join(MODEL_DIR, path.basename(file));
		if (!(await fileExists(filePath))) {
			const url = `https://huggingface.co/${MODEL_NAME}/resolve/main/${file}`;
			await downloadFile(url, filePath);
		}
	}
}

async function forceRedownloadModel(): Promise<void> {
	for (const file of MODEL_FILES) {
		const filePath = path.join(MODEL_DIR, path.basename(file));
		if (await fileExists(filePath)) {
			await fs.unlink(filePath).catch(() => {/* ignore */});
		}
	}
}

interface TokenizerJson {
	model: {
		vocab: Record<string, number>;
	};
}

async function loadModelAndVocab(): Promise<{session: ort.InferenceSession; vocab: Map<string, number>}> {
	const modelPath = path.join(MODEL_DIR, "model.onnx");
	const vocabPath = path.join(MODEL_DIR, "tokenizer.json");

	const modelBuffer = await fs.readFile(modelPath);
	const session = await ort.InferenceSession.create(modelBuffer);

	const tokenizerJson = JSON.parse(await fs.readFile(vocabPath, "utf-8")) as TokenizerJson;

	if (!tokenizerJson.model?.vocab) {
		throw new Error("Invalid tokenizer structure: missing model.vocab");
	}

	const vocab = new Map<string, number>();
	for (const [token, id] of Object.entries(tokenizerJson.model.vocab)) {
		if (typeof id === "number") {
			vocab.set(token, id);
		}
	}

	return {session, vocab};
}

// Text normalization
function normalizeText(text: string): string {
	return text
		.normalize("NFD")
		// eslint-disable-next-line no-control-regex
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

// Tokenization helpers
function isPunctuation(char: string): boolean {
	const cp = char.codePointAt(0)!;

	if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
		return true;
	}

	return /\p{P}/u.test(char);
}

function preTokenize(text: string): string[] {
	const tokens: string[] = [];
	let currentToken = "";

	for (const char of text) {
		if (/\s/.test(char)) {
			if (currentToken) {
				tokens.push(currentToken);
				currentToken = "";
			}
		} else if (isPunctuation(char)) {
			if (currentToken) {
				tokens.push(currentToken);
				currentToken = "";
			}
			tokens.push(char);
		} else {
			currentToken += char;
		}
	}

	if (currentToken) {
		tokens.push(currentToken);
	}

	return tokens.filter((token) => token.length > 0);
}

function wordPieceTokenize(
	token: string, vocab: Map<string, number>, unkToken = "[UNK]", maxInputCharsPerWord = 200
): string[] {
	if (token.length > maxInputCharsPerWord) {
		return [unkToken];
	}

	const outputTokens: string[] = [];
	let start = 0;

	while (start < token.length) {
		let end = token.length;
		let currentSubstring: string | null = null;

		while (start < end) {
			let substring = token.substring(start, end);

			if (start > 0) {
				substring = "##" + substring;
			}

			if (vocab.has(substring)) {
				currentSubstring = substring;
				break;
			}
			end -= 1;
		}

		if (currentSubstring === null) {
			return [unkToken];
		}

		outputTokens.push(currentSubstring);
		start = end;
	}

	return outputTokens;
}

function validateTokenIds(ids: number[]): number[] {
	for (const id of ids) {
		if (typeof id !== "number" || isNaN(id) || !isFinite(id)) {
			throw new Error(`Invalid token ID detected: ${id} (type: ${typeof id})`);
		}
	}
	return ids;
}

// Main tokenization
function wordPieceTokenizer(
	text: string, vocab: Map<string, number>, maxLength = 512
): {tokens: string[]; ids: number[]}[] {
	const unkToken = "[UNK]";
	const clsToken = "[CLS]";
	const sepToken = "[SEP]";

	const clsId = vocab.get(clsToken) ?? 101;
	const sepId = vocab.get(sepToken) ?? 102;
	const unkId = vocab.get(unkToken) ?? 100;

	const normalizedText = normalizeText(text);
	const preTokens = preTokenize(normalizedText);

	const tokens = [clsToken];
	const ids = [clsId];

	for (const preToken of preTokens) {
		const lowercaseToken = preToken.toLowerCase();
		const wordPieceTokens = wordPieceTokenize(lowercaseToken, vocab, unkToken);

		for (const wpToken of wordPieceTokens) {
			const tokenId = vocab.get(wpToken) ?? unkId;
			tokens.push(wpToken);
			ids.push(tokenId);
		}
	}

	tokens.push(sepToken);
	ids.push(sepId);

	if (tokens.length <= maxLength) {
		return [{tokens, ids}];
	}

	// For longer texts, create overlapping chunks
	const maxContentLength = maxLength - 2;
	const overlap = Math.floor(maxContentLength * 0.1);
	const chunkSize = maxContentLength - overlap;

	const chunks: {tokens: string[]; ids: number[]}[] = [];
	const contentTokens = tokens.slice(1, -1);
	const contentIds = ids.slice(1, -1);

	for (let i = 0; i < contentTokens.length; i += chunkSize) {
		const chunkTokens = [clsToken, ...contentTokens.slice(i, i + maxContentLength - 1), sepToken];
		const chunkIds = [clsId, ...contentIds.slice(i, i + maxContentLength - 1), sepId];

		chunks.push({
			tokens: chunkTokens,
			ids: chunkIds,
		});
	}

	return chunks;
}

// Process embeddings for multiple chunks and combine them
async function processChunkedEmbeddings(
	chunks: {ids: number[]}[], session: ort.InferenceSession
): Promise<Float32Array> {
	const embeddings: Float32Array[] = [];

	for (const chunk of chunks) {
		const validIds = validateTokenIds(chunk.ids);

		const inputIds = new BigInt64Array(validIds.map((i) => BigInt(i)));
		const attentionMask = new BigInt64Array(validIds.length).fill(BigInt(1));
		const tokenTypeIds = new BigInt64Array(validIds.length).fill(BigInt(0));

		const results = await session.run({
			input_ids: new ort.Tensor("int64", inputIds, [1, validIds.length]),
			attention_mask: new ort.Tensor("int64", attentionMask, [1, validIds.length]),
			token_type_ids: new ort.Tensor("int64", tokenTypeIds, [1, validIds.length]),
		});

		const lastHiddenState = results.last_hidden_state;
		const [, sequenceLength, hiddenSize] = lastHiddenState.dims;
		const embeddingData = lastHiddenState.data as Float32Array;

		// Mean pooling
		const pooledEmbedding = new Float32Array(hiddenSize);
		for (let i = 0; i < hiddenSize; i++) {
			let sum = 0;
			for (let j = 0; j < sequenceLength; j++) {
				sum += embeddingData[j * hiddenSize + i];
			}
			pooledEmbedding[i] = sum / sequenceLength;
		}

		embeddings.push(pooledEmbedding);
	}

	// If multiple chunks, average the embeddings
	if (embeddings.length === 1) {
		return normalize(embeddings[0]);
	}

	const hiddenSize = embeddings[0].length;
	const avgEmbedding = new Float32Array(hiddenSize);

	for (let i = 0; i < hiddenSize; i++) {
		let sum = 0;
		for (const emb of embeddings) {
			sum += emb[i];
		}
		avgEmbedding[i] = sum / embeddings.length;
	}

	return normalize(avgEmbedding);
}

function normalize(v: Float32Array): Float32Array {
	let norm = 0;
	for (const val of v) {
		norm += val * val;
	}
	norm = Math.sqrt(norm);

	const result = new Float32Array(v.length);
	let i = 0;
	for (const val of v) {
		result[i++] = val / norm;
	}
	return result;
}

// Singleton model state
let session: ort.InferenceSession | null = null;
let vocab: Map<string, number> | null = null;
let modelInitPromise: Promise<void> | null = null;

async function initializeModelAndVocab(): Promise<void> {
	try {
		const result = await loadModelAndVocab();
		session = result.session;
		vocab = result.vocab;
	} catch {
		await forceRedownloadModel();
		await downloadModelIfNeeded();
		const result = await loadModelAndVocab();
		session = result.session;
		vocab = result.vocab;
	}
}

export function resetSession(): void {
	session = null;
	vocab = null;
	modelInitPromise = null;
}

export default async function embedding(text: string): Promise<Float32Array> {
	modelInitPromise ??= (async () => {
		try {
			await downloadModelIfNeeded();
			await initializeModelAndVocab();
		} catch (error) {
			modelInitPromise = null;
			throw error;
		}
	})();

	await modelInitPromise;

	if (!session || !vocab) {
		await initializeModelAndVocab();
	}

	const chunks = wordPieceTokenizer(text, vocab!);

	try {
		return await processChunkedEmbeddings(chunks, session!);
	} catch {
		await forceRedownloadModel();
		await downloadModelIfNeeded();
		await initializeModelAndVocab();

		return await processChunkedEmbeddings(chunks, session!);
	}
}
