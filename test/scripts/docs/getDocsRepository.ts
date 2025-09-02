/* eslint-disable @typescript-eslint/require-await */
import anyTest, {TestFn} from "ava";
import esmock from "esmock";
import path from "node:path";
import sinonGlobal, {SinonSandbox} from "sinon";
import {PassThrough} from "node:stream";
import {createFsMocks} from "../../utils/fsMocks.js";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "..", "..", "tmp", "docs");

async function getMockedModule(sinon: SinonSandbox) {
	const fsMocks = createFsMocks(sinon);

	const {default: getDocsRepository} = await esmock(
		"../../../scripts/docs/getDocsRepository.js", {
			"../../../scripts/docs/downloadHelper.js": {
				downloadFile: sinon.stub().resolves("/mock/docs/sapui5-commitSha.zip"),
			},
			"../../../src/utils.js": {
				dirExists: async (dir: unknown) => fsMocks.dirs.has(dir),
			},
			"yauzl-promise": {
				open: sinon.stub().resolves({
					async* [Symbol.asyncIterator]() {
						yield {
							filename: "sapui5-commitSha/",
						};
						yield {
							filename: "sapui5-commitSha/foo.txt",
							openReadStream: sinon.stub().callsFake(async () => {
								const stream = new PassThrough();
								stream.end("file content");
								return stream;
							}),
						};
					},
					close: sinon.stub().resolves(),
				}),
			},
			...fsMocks.modules,
		}
	);
	return {getDocsRepository, fsMocks, docsDir};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getDocsRepository: (commitSha: string) => Promise<string>;
	fsMocks: ReturnType<typeof createFsMocks>;
	docsDir: string;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const {getDocsRepository, fsMocks, docsDir} = await getMockedModule(t.context.sinon);
	t.context.getDocsRepository = getDocsRepository;
	t.context.fsMocks = fsMocks;
	t.context.docsDir = docsDir;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("getDocsRepository returns cached dir if exists", async (t) => {
	const {getDocsRepository, fsMocks, docsDir} = t.context;

	// Add a mock directory for the cached docs
	const commitSha = "a".repeat(40);
	const targetDir = path.join(docsDir, `sapui5-${commitSha}`);
	fsMocks.dirs.add(targetDir);

	const result = await getDocsRepository(commitSha);
	t.is(result, targetDir);
});

test.serial("getDocsRepository downloads and extracts if not cached", async (t) => {
	const {getDocsRepository, fsMocks, docsDir} = t.context;

	const commitSha = "b".repeat(40);
	const targetDir = path.join(docsDir, `sapui5-${commitSha}`);
	const stagingDir = path.join(docsDir, "staging", `sapui5-${commitSha}`);
	const extractedDir = path.join(stagingDir, `sapui5-${commitSha}`);
	fsMocks.dirs.add(stagingDir);
	fsMocks.dirs.add(extractedDir);

	const result = await getDocsRepository(commitSha);
	t.is(result, targetDir);
});

test.serial("getDocsRepository throws on invalid SHA", async (t) => {
	const {getDocsRepository} = t.context;
	await t.throwsAsync(() => getDocsRepository("notasha"), {message: /Invalid commit SHA/});
});
