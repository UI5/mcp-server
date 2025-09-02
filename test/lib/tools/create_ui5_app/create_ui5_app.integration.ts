import anyTest, {TestFn} from "ava";
import path from "node:path";
import {mkdir, rm} from "node:fs/promises";
import esmock from "esmock";
import sinonGlobal from "sinon";
import {fileURLToPath} from "url";
import {checkFileContentsIgnoreLineFeeds, directoryDeepEqual, findFiles} from "../../../utils/fshelper.js";
import {InvalidInputError} from "../../../../src/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define test context type
const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
	createUi5App: typeof import("../../../../src/tools/create_ui5_app/create_ui5_app.js").createUi5App;
}>;

const expectedPath = path.join(__dirname, "..", "..", "..", "expected", "create_ui5_app", "com.test.apiapp");

// Setup test context before each test
test.beforeEach(async (t) => {
	// Create a sandbox for sinon stubs
	t.context.sinon = sinonGlobal.createSandbox();

	// Create logger mock
	const loggerMock = {
		silly: t.context.sinon.stub(),
		verbose: t.context.sinon.stub(),
		perf: t.context.sinon.stub(),
		info: t.context.sinon.stub(),
		warn: t.context.sinon.stub(),
		error: t.context.sinon.stub(),
		isLevelEnabled: t.context.sinon.stub().returns(true),
	};
	t.context.loggerMock = loggerMock;

	// Mock the @ui5/logger module
	const {createUi5App} = await esmock("../../../../src/tools/create_ui5_app/create_ui5_app.js", {
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
			isLogLevelEnabled: t.context.sinon.stub().returns(true),
		},
	});

	t.context.createUi5App = createUi5App;
});

// Clean up after each test
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("Generate template", async (t) => {
	const targetDir = path.join(__dirname, "..", "..", "..", "tmp", "create_ui5_app");
	await rm(targetDir, {recursive: true, force: true});
	const result = await t.context.createUi5App({
		appNamespace: "com.test.apiapp",
		framework: "SAPUI5",
		frameworkVersion: "1.136.0",
		author: "API Test",
		basePath: targetDir,
		createAppDirectory: true,
		initializeGitRepository: false,
		runNpmInstall: false,
		typescript: true,
	});
	t.is(result.finalLocation, path.join(targetDir, "com.test.apiapp"),
		"Final location should match the target directory");

	// Create a normalized version of the result for snapshotting to avoid machine-specific paths
	const normalizedResult = {
		...result,
		basePath: result.basePath ? "<NORMALIZED_PATH>/tmp/com.test.apiapp" : undefined,
		finalLocation: result.finalLocation ? "<NORMALIZED_PATH>/com.test.apiapp" : undefined,
		generatedFiles: result.generatedFiles.map((filePath) => filePath.replace(/\\/g, "/")),
		message: result.message.replace(
			new RegExp(result.finalLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
			"<NORMALIZED_PATH>/com.test.apiapp"
		),
	};
	t.snapshot(normalizedResult, "Result of createUi5App should match expected structure");

	const expectedFiles = await findFiles(expectedPath);
	// Check for all directories and files
	await directoryDeepEqual(t, result.finalLocation, expectedPath);
	// Check for all file contents
	await checkFileContentsIgnoreLineFeeds(t, expectedFiles, expectedPath, result.finalLocation);
});

test("Generate JavaScript template", async (t) => {
	const targetDir = path.join(__dirname, "..", "..", "..", "tmp", "create_ui5_app_js");
	await rm(targetDir, {recursive: true, force: true});
	const result = await t.context.createUi5App({
		appNamespace: "com.test.jsapp",
		framework: "SAPUI5",
		frameworkVersion: "1.136.0",
		author: "API Test",
		basePath: targetDir,
		createAppDirectory: true,
		initializeGitRepository: false,
		runNpmInstall: false,
		typescript: false,
	});
	t.is(result.finalLocation, path.join(targetDir, "com.test.jsapp"),
		"Final location should match the target directory");

	// Verify that the message indicates JavaScript was used
	t.true(result.message.includes("JavaScript application"), "Message should indicate JavaScript application");

	// Create a normalized version of the result for snapshotting
	const normalizedResult = {
		...result,
		basePath: result.basePath ? "<NORMALIZED_PATH>/tmp/create_ui5_app_js" : undefined,
		finalLocation: result.finalLocation ? "<NORMALIZED_PATH>/com.test.jsapp" : undefined,
		generatedFiles: result.generatedFiles.map((filePath) => filePath.replace(/\\/g, "/")),
		message: result.message.replace(
			new RegExp(result.finalLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
			"<NORMALIZED_PATH>/com.test.jsapp"
		),
	};
	t.snapshot(normalizedResult, "Result of createUi5App for JavaScript should match expected structure");

	// Verify that no error logs were made
	t.is(t.context.loggerMock.error.callCount, 0, "No error logs should be made during successful app creation");
});

test("Target path already exists", async (t) => {
	const baseDir = path.join(__dirname, "..", "..", "..", "tmp");
	const targetDir = path.join(baseDir, "dir_that_exists");
	await mkdir(targetDir, {recursive: true});
	await t.throwsAsync(async () => {
		await t.context.createUi5App({
			appNamespace: "dir_that_exists",
			framework: "SAPUI5",
			frameworkVersion: "1.136.0",
			basePath: baseDir,
			createAppDirectory: true,
			initializeGitRepository: false,
			runNpmInstall: false,
		});
	}, {
		message:
			`Target directory '${targetDir}' already exists. Please choose a different namespace or base path ` +
			`or remove the existing directory.`,
		instanceOf: InvalidInputError,
	});
});
