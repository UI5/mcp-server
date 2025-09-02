import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import path from "node:path";
import {PassThrough} from "node:stream";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	downloadFile: typeof import("../../../scripts/docs/downloadHelper.js").downloadFile;
	fetchStub: sinonGlobal.SinonStub;
	mkdirStub: sinonGlobal.SinonStub;
	createWriteStreamStub: sinonGlobal.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Create stubs for fs functions
	const mkdirStub = t.context.sinon.stub().resolves();
	t.context.mkdirStub = mkdirStub;

	// Create stub for createWriteStream
	const writeStreamMock = new PassThrough();
	const createWriteStreamStub = t.context.sinon.stub().returns(writeStreamMock);
	t.context.createWriteStreamStub = createWriteStreamStub;

	// Create stub for global fetch
	const fetchStub = t.context.sinon.stub();
	t.context.fetchStub = fetchStub;

	// Import the module with mocked dependencies
	const {downloadFile} = await esmock("../../../scripts/docs/downloadHelper.js", {
		"make-fetch-happen": fetchStub,
		"node:fs/promises": {
			mkdir: mkdirStub,
		},
		"node:fs": {
			createWriteStream: createWriteStreamStub,
		},
	});

	t.context.downloadFile = downloadFile;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("downloadFile downloads and saves file successfully", async (t) => {
	const {downloadFile, fetchStub, mkdirStub, createWriteStreamStub, sinon} = t.context;

	const url = "https://example.com/files/test-file.zip";
	const targetDir = "/path/to/target";
	const expectedFilePath = path.join(targetDir, "test-file.zip");

	// Create a mock stream
	const body = new PassThrough();
	body.end("TEST");

	// Spy pipe method
	const bodyPipeSpy = sinon.spy(body, "pipe");

	const mockResponse = {
		ok: true,
		status: 200,
		statusText: "OK",
		body,
	};
	fetchStub.resolves(mockResponse as unknown as Response);

	// Call the function
	const result = await downloadFile(url, targetDir);

	// Verify fetch was called with the correct URL
	t.true(fetchStub.calledOnce);
	t.is(fetchStub.firstCall.args[0], url);

	// Verify directory was created
	t.true(mkdirStub.calledOnce);
	t.deepEqual(mkdirStub.firstCall.args, [targetDir, {recursive: true}]);

	// Verify write stream was created with the correct file path
	t.true(createWriteStreamStub.calledOnce);
	t.is(createWriteStreamStub.firstCall.args[0], expectedFilePath);

	// Verify body.pipe was called with the write stream
	t.true(bodyPipeSpy.calledOnce);
	t.is(bodyPipeSpy.firstCall.args[0], createWriteStreamStub.firstCall.returnValue);

	// Verify the function returns the correct file path
	t.is(result, expectedFilePath);
});

test.serial("downloadFile throws error for 404 response", async (t) => {
	const {downloadFile, fetchStub} = t.context;

	const url = "https://example.com/files/not-found.zip";
	const targetDir = "/path/to/target";

	// Mock 404 response
	const mockResponse = {
		ok: false,
		status: 404,
		statusText: "Not Found",
	};
	fetchStub.resolves(mockResponse as unknown as Response);

	// Call the function and expect it to throw
	await t.throwsAsync(async () => {
		await downloadFile(url, targetDir);
	}, {message: "The requested version does not exist"});
});

test.serial("downloadFile throws error for other HTTP errors", async (t) => {
	const {downloadFile, fetchStub} = t.context;

	const url = "https://example.com/files/error.zip";
	const targetDir = "/path/to/target";

	// Mock error response
	const mockResponse = {
		ok: false,
		status: 500,
		statusText: "Server Error",
	};
	fetchStub.resolves(mockResponse as unknown as Response);

	// Call the function and expect it to throw
	await t.throwsAsync(async () => {
		await downloadFile(url, targetDir);
	}, {message: "Unexpected response 500: Server Error"});
});

test.serial("downloadFile extracts filename from URL", async (t) => {
	const {downloadFile, fetchStub, createWriteStreamStub} = t.context;

	const url = "https://example.com/path/with/multiple/segments/file-name.zip";
	const targetDir = "/path/to/target";
	const expectedFilePath = path.join(targetDir, "file-name.zip");

	// Create a mock stream
	const body = new PassThrough();
	body.end("TEST");

	const mockResponse = {
		ok: true,
		status: 200,
		statusText: "OK",
		body,
	};
	fetchStub.resolves(mockResponse as unknown as Response);

	// Call the function
	const result = await downloadFile(url, targetDir);

	// Verify write stream was created with the correct file path (extracted from URL)
	t.true(createWriteStreamStub.calledOnce);
	t.is(createWriteStreamStub.firstCall.args[0], expectedFilePath);

	// Verify the function returns the correct file path
	t.is(result, expectedFilePath);
});
