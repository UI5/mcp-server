import anyTest, {TestFn} from "ava";
import esmock from "esmock";
import path from "node:path";
import sinonGlobal, {SinonSandbox} from "sinon";
import {DocumentationIndexEntry} from "../../../src/resources/documentation/getDocumentation.js";

async function getMockedModule(sinon: SinonSandbox) {
	const docsRootPath = "/mock/docs";

	// Mock for fileExists
	const fileExistsStub = sinon.stub();

	// Mock for readFile and writeFile
	const readFileStub = sinon.stub();
	const writeFileStub = sinon.stub().resolves();

	// Mock for globby
	const globbyStub = sinon.stub();

	const {default: getDocsIndex, createIndexFile, createIndex} = await esmock(
		"../../../scripts/docs/getDocsIndex.js", {
			"../../../src/utils.js": {
				fileExists: fileExistsStub,
			},
			"globby": {
				globby: globbyStub,
			},
			"node:fs/promises": {
				readFile: readFileStub,
				writeFile: writeFileStub,
			},
		}
	);

	return {
		getDocsIndex,
		createIndexFile,
		createIndex,
		fileExistsStub,
		readFileStub,
		writeFileStub,
		globbyStub,
		docsRootPath,
	};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getDocsIndex: (docsRootPath: string, frameworkVersion: string) => Promise<DocumentationIndexEntry[]>;
	createIndexFile: (docsRootPath: string, indexFilePath: string, frameworkVersion: string) => Promise<void>;
	createIndex: (docsRootPath: string, frameworkVersion: string) => Promise<DocumentationIndexEntry[]>;
	fileExistsStub: sinonGlobal.SinonStub;
	readFileStub: sinonGlobal.SinonStub;
	writeFileStub: sinonGlobal.SinonStub;
	globbyStub: sinonGlobal.SinonStub;
	docsRootPath: string;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const {
		getDocsIndex,
		createIndexFile,
		createIndex,
		fileExistsStub,
		readFileStub,
		writeFileStub,
		globbyStub,
		docsRootPath,
	} = await getMockedModule(t.context.sinon);

	t.context.getDocsIndex = getDocsIndex;
	t.context.createIndexFile = createIndexFile;
	t.context.createIndex = createIndex;
	t.context.fileExistsStub = fileExistsStub;
	t.context.readFileStub = readFileStub;
	t.context.writeFileStub = writeFileStub;
	t.context.globbyStub = globbyStub;
	t.context.docsRootPath = docsRootPath;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("getDocsIndex returns existing index if available", async (t) => {
	const {getDocsIndex, fileExistsStub, readFileStub, docsRootPath} = t.context;

	const frameworkVersion = "1.120.0";
	const indexFilePath = path.join(docsRootPath, "mcp-index.json");
	const mockIndex = [
		{
			shortIdentifier: "123abc",
			identifier: "abcdef123456",
			uri: "https://ui5.sap.com/1.120.0/topic/abcdef123456",
			title: "Test Document",
			filePath: "path/to/doc.md",
		},
	];

	// Setup: Index file exists
	fileExistsStub.withArgs(indexFilePath).resolves(true);
	readFileStub.withArgs(indexFilePath, "utf8").resolves(JSON.stringify(mockIndex));

	const result = await getDocsIndex(docsRootPath, frameworkVersion);

	t.deepEqual(result, mockIndex);
});

test.serial("getDocsIndex creates index if it doesn't exist", async (t) => {
	const {
		getDocsIndex,
		fileExistsStub,
		readFileStub,
		writeFileStub,
		globbyStub,
		docsRootPath,
	} = t.context;

	const frameworkVersion = "1.120.0";
	const indexFilePath = path.join(docsRootPath, "mcp-index.json");
	const mockIndex = [
		{
			shortIdentifier: "123abc",
			identifier: "abcdef123456",
			uri: "https://ui5.sap.com/1.120.0/topic/abcdef123456",
			title: "Test Document",
			filePath: "path/to/doc.md",
		},
	];

	// Setup: Index file doesn't exist initially, but is created
	fileExistsStub.withArgs(indexFilePath).onFirstCall().resolves(false);
	fileExistsStub.withArgs(indexFilePath).onSecondCall().resolves(false);

	// Mock globby to return a file path
	const mockFilePath = path.join(docsRootPath, "path/to/test-doc-123abc.md");
	globbyStub.resolves([mockFilePath]);

	// Mock readFile to return markdown content
	const mockMarkdown = `# Test Document\n\n<!-- loioabcdef123456 -->\n\nContent here`;
	readFileStub.withArgs(mockFilePath, "utf-8").resolves(mockMarkdown);

	// After index is created, it's read back
	readFileStub.withArgs(indexFilePath, "utf8").resolves(JSON.stringify(mockIndex));

	const result = await getDocsIndex(docsRootPath, frameworkVersion);

	// Verify index was written
	t.true(writeFileStub.calledOnce);
	t.deepEqual(result, mockIndex);
});

test.serial("createIndex processes markdown files correctly", async (t) => {
	const {createIndex, globbyStub, readFileStub, docsRootPath} = t.context;

	const frameworkVersion = "1.120.0";

	// Mock globby to return file paths
	const mockFilePaths = [
		path.join(docsRootPath, "path/to/test-doc-123abc.md"),
		path.join(docsRootPath, "path/to/z_another-doc-456def.md"),
	];
	globbyStub.resolves(mockFilePaths);

	// Mock readFile to return markdown content
	const mockMarkdown1 = `# Test Document\n\n<!-- loioabcdef123456 -->\n\nContent here`;
	const mockMarkdown2 = `# Another Document\n\n<!-- loio789ghijkl -->\n\nMore content`;

	readFileStub.withArgs(mockFilePaths[0], "utf-8").resolves(mockMarkdown1);
	readFileStub.withArgs(mockFilePaths[1], "utf-8").resolves(mockMarkdown2);

	const result = await createIndex(docsRootPath, frameworkVersion);

	// Verify index entries
	t.is(result.length, 2);
	t.is(result[0].shortIdentifier, "123abc");
	t.is(result[0].identifier, "abcdef123456");
	t.is(result[0].title, "Test Document");
	t.is(result[0].uri, `https://ui5.sap.com/${frameworkVersion}/topic/abcdef123456`);

	t.is(result[1].shortIdentifier, "456def");
	t.is(result[1].identifier, "789ghijkl");
	t.is(result[1].title, "Another Document");
	t.is(result[1].uri, `https://ui5.sap.com/${frameworkVersion}/topic/789ghijkl`);
});

test.serial("createIndex handles files without headers by using filename", async (t) => {
	const {createIndex, globbyStub, readFileStub, docsRootPath} = t.context;

	const frameworkVersion = "1.120.0";

	// Mock globby to return file paths
	const mockFilePath = path.join(docsRootPath, "path/to/test-doc-123abc.md");
	globbyStub.resolves([mockFilePath]);

	// Mock readFile to return markdown content without a header but with loio
	const mockMarkdown = `<!-- loioabcdef123456 -->\n\nContent here without header`;
	readFileStub.withArgs(mockFilePath, "utf-8").resolves(mockMarkdown);

	const result = await createIndex(docsRootPath, frameworkVersion);

	// Verify index entry uses filename for title
	t.is(result.length, 1);
	t.is(result[0].shortIdentifier, "123abc");
	t.is(result[0].identifier, "abcdef123456");
	t.is(result[0].title, "test doc"); // Derived from filename
});

test.serial("createIndex skips files without loio identifier", async (t) => {
	const {createIndex, globbyStub, readFileStub, docsRootPath} = t.context;

	const frameworkVersion = "1.120.0";

	// Mock globby to return file paths
	const mockFilePath = path.join(docsRootPath, "path/to/test-doc-123abc.md");
	globbyStub.resolves([mockFilePath]);

	// Mock readFile to return markdown content without a loio identifier
	const mockMarkdown = `# Test Document\n\nContent here without loio`;
	readFileStub.withArgs(mockFilePath, "utf-8").resolves(mockMarkdown);

	const result = await createIndex(docsRootPath, frameworkVersion);

	// Verify no index entries were created
	t.is(result.length, 0);
});

test.serial("createIndex throws error for invalid filename", async (t) => {
	const {createIndex, globbyStub, readFileStub, docsRootPath} = t.context;

	const frameworkVersion = "1.120.0";

	// Mock globby to return file paths with invalid name (no shortIdentifier)
	const mockFilePath = path.join(docsRootPath, "path/to/invalid_filename.md");
	globbyStub.resolves([mockFilePath]);

	// Mock readFile to return some content
	readFileStub.withArgs(mockFilePath, "utf-8").resolves("# Some content");

	// Should throw error because filename doesn't have the expected format
	await t.throwsAsync(
		async () => createIndex(docsRootPath, frameworkVersion),
		{message: /Could not extract loio identifier from path/}
	);
});
