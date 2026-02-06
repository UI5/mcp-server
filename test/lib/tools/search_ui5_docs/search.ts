import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	fsReaddir: sinonGlobal.SinonStub;
	fsReadFile: sinonGlobal.SinonStub;
	embeddingStub: sinonGlobal.SinonStub;
	searchDocs: typeof import("../../../../src/tools/search_ui5_docs/search.js").searchDocs;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const fsReaddir = t.context.sinon.stub();
	const fsReadFile = t.context.sinon.stub();
	const embeddingStub = t.context.sinon.stub();

	t.context.fsReaddir = fsReaddir;
	t.context.fsReadFile = fsReadFile;
	t.context.embeddingStub = embeddingStub;

	const {searchDocs} = await esmock("../../../../src/tools/search_ui5_docs/search.js", {
		"fs/promises": {
			readdir: fsReaddir,
			readFile: fsReadFile,
		},
		"../../../../src/tools/search_ui5_docs/embedding.js": {
			default: embeddingStub,
		},
	});

	t.context.searchDocs = searchDocs;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

function createMockEmbedding(values: number[]): Float32Array {
	return new Float32Array(values);
}

test("searchDocs loads embeddings and returns results", async (t) => {
	const {fsReaddir, fsReadFile, embeddingStub, searchDocs} = t.context;

	fsReaddir.resolves(["snippets.meta.json"]);

	const metadata = {id: "snippets", dimensions: 3, count: 2};
	const jsonData = [
		{source: "Button", summary: "A button", code: "new Button()", kind: "code"},
		{source: "Input", summary: "An input", code: "new Input()", kind: "code"},
	];
	const embeddings = new Float32Array([0.5, 0.5, 0.5, 0.3, 0.3, 0.3]);

	fsReadFile.callsFake((path: string) => {
		if (path.endsWith(".meta.json")) return Promise.resolve(JSON.stringify(metadata));
		if (path.endsWith(".json")) return Promise.resolve(JSON.stringify(jsonData));
		if (path.endsWith(".bin")) return Promise.resolve(Buffer.from(embeddings.buffer));
		return Promise.reject(new Error("Unknown file"));
	});

	embeddingStub.resolves(createMockEmbedding([0.5, 0.5, 0.5]));

	const results = await searchDocs("button", 2);

	t.true(fsReaddir.calledOnce);
	t.is(results.length, 2);
	t.is(results[0].source, "Button");
	t.is(results[1].source, "Input");
});

test("searchDocs caches embeddings", async (t) => {
	const {fsReaddir, fsReadFile, embeddingStub, searchDocs} = t.context;

	fsReaddir.resolves(["snippets.meta.json"]);

	const metadata = {id: "snippets", dimensions: 3, count: 1};
	const jsonData = [{source: "Button", summary: "A button", code: "new Button()"}];
	const embeddings = new Float32Array([0.5, 0.5, 0.5]);

	fsReadFile.callsFake((path: string) => {
		if (path.endsWith(".meta.json")) return Promise.resolve(JSON.stringify(metadata));
		if (path.endsWith(".json")) return Promise.resolve(JSON.stringify(jsonData));
		if (path.endsWith(".bin")) return Promise.resolve(Buffer.from(embeddings.buffer));
		return Promise.reject(new Error("Unknown file"));
	});

	embeddingStub.resolves(createMockEmbedding([0.5, 0.5, 0.5]));

	await searchDocs("first", 1);
	await searchDocs("second", 1);

	t.is(fsReaddir.callCount, 1);
	t.is(embeddingStub.callCount, 2);
});

test("searchDocs throws when no embeddings found", async (t) => {
	const {fsReaddir, searchDocs} = t.context;

	fsReaddir.resolves([]);

	await t.throwsAsync(async () => {
		await searchDocs("test", 5);
	}, {message: /Embeddings not found/});
});

test("searchDocs uses default limit of 5", async (t) => {
	const {fsReaddir, fsReadFile, embeddingStub, searchDocs} = t.context;

	fsReaddir.resolves(["snippets.meta.json"]);

	const metadata = {id: "snippets", dimensions: 3, count: 10};
	const jsonData = Array.from({length: 10}, (_, i) => ({
		source: `Item${i}`, summary: `Summary ${i}`, code: `code${i}()`,
	}));
	const embeddings = new Float32Array(30).fill(0.5);

	fsReadFile.callsFake((path: string) => {
		if (path.endsWith(".meta.json")) return Promise.resolve(JSON.stringify(metadata));
		if (path.endsWith(".json")) return Promise.resolve(JSON.stringify(jsonData));
		if (path.endsWith(".bin")) return Promise.resolve(Buffer.from(embeddings.buffer));
		return Promise.reject(new Error("Unknown file"));
	});

	embeddingStub.resolves(createMockEmbedding([0.5, 0.5, 0.5]));

	const results = await searchDocs("test");

	t.is(results.length, 5);
});

test("searchDocs sorts by similarity score", async (t) => {
	const {fsReaddir, fsReadFile, embeddingStub, searchDocs} = t.context;

	fsReaddir.resolves(["snippets.meta.json"]);

	const metadata = {id: "snippets", dimensions: 3, count: 3};
	const jsonData = [
		{source: "Low", summary: "Low score", code: "low()"},
		{source: "High", summary: "High score", code: "high()"},
		{source: "Mid", summary: "Mid score", code: "mid()"},
	];
	// Embeddings: Low=[0.1,0.1,0.1], High=[0.9,0.9,0.9], Mid=[0.5,0.5,0.5]
	const embeddings = new Float32Array([0.1, 0.1, 0.1, 0.9, 0.9, 0.9, 0.5, 0.5, 0.5]);

	fsReadFile.callsFake((path: string) => {
		if (path.endsWith(".meta.json")) return Promise.resolve(JSON.stringify(metadata));
		if (path.endsWith(".json")) return Promise.resolve(JSON.stringify(jsonData));
		if (path.endsWith(".bin")) return Promise.resolve(Buffer.from(embeddings.buffer));
		return Promise.reject(new Error("Unknown file"));
	});

	// Query embedding close to "High"
	embeddingStub.resolves(createMockEmbedding([0.9, 0.9, 0.9]));

	const results = await searchDocs("test", 3);

	t.is(results[0].source, "High");
	t.is(results[2].source, "Low");
});

test("searchDocs handles documentation kind", async (t) => {
	const {fsReaddir, fsReadFile, embeddingStub, searchDocs} = t.context;

	fsReaddir.resolves(["snippets.meta.json"]);

	const metadata = {id: "snippets", dimensions: 3, count: 1};
	const jsonData = [
		{source: "Guide", summary: "A guide", content: "Guide content", kind: "documentation"},
	];
	const embeddings = new Float32Array([0.5, 0.5, 0.5]);

	fsReadFile.callsFake((path: string) => {
		if (path.endsWith(".meta.json")) return Promise.resolve(JSON.stringify(metadata));
		if (path.endsWith(".json")) return Promise.resolve(JSON.stringify(jsonData));
		if (path.endsWith(".bin")) return Promise.resolve(Buffer.from(embeddings.buffer));
		return Promise.reject(new Error("Unknown file"));
	});

	embeddingStub.resolves(createMockEmbedding([0.5, 0.5, 0.5]));

	const results = await searchDocs("guide", 1);

	t.is(results[0].kind, "documentation");
	t.is(results[0].content, "Guide content");
	t.is(results[0].code, undefined);
});
