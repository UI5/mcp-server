import anyTest, {TestFn} from "ava";
import esmock from "esmock";
import sinonGlobal from "sinon";
import {InvalidInputError} from "../../../../src/utils.js";
import path from "node:path";

// Define test context type
const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	mkdirStub: sinonGlobal.SinonStub;
	readFileStub: sinonGlobal.SinonStub;
	dirExistsStub: sinonGlobal.SinonStub;
	originalEnv: NodeJS.ProcessEnv;
	renderStub: sinonGlobal.SinonStub;
	staticFiles: string[];
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
	globbyStub: sinonGlobal.SinonStub;
	createIntegrationCard: typeof import(
		"../../../../src/tools/create_integration_card/create_integration_card.js"
	).createIntegrationCard;
}>;

// Setup test context before each test
test.beforeEach(async (t) => {
	// Create a sandbox for sinon stubs
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.originalEnv = {...process.env};

	t.context.mkdirStub = t.context.sinon.stub().resolves();
	t.context.readFileStub = t.context.sinon.stub().resolves();
	t.context.dirExistsStub = t.context.sinon.stub().resolves(false);

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
	t.context.renderStub = t.context.sinon.stub();
	t.context.renderStub.callsFake((template, data, options) => {
		if (options?.filename?.endsWith?.(".json")) {
			return JSON.stringify({});
		}
		return "Some content...";
	});

	// Stub globby to return a fixed set of files
	t.context.staticFiles = [
		"src/manifest.json",
		"src/i18n/i18n.properties",
		"test/index.html",
	];
	t.context.globbyStub = t.context.sinon.stub().resolves(t.context.staticFiles);

	const {createIntegrationCard} = await esmock(
		"../../../../src/tools/create_integration_card/create_integration_card.js", {
			"@ui5/logger": {
				getLogger: t.context.sinon.stub().returns(loggerMock),
				isLogLevelEnabled: t.context.sinon.stub().returns(true),
			},
			"fs/promises": {
				mkdir: t.context.mkdirStub,
				writeFile: t.context.sinon.stub().resolves(),
				readFile: t.context.readFileStub,
			},
			"ejs": {
				render: t.context.renderStub,
			},
			"globby": {
				globby: t.context.globbyStub,
			},
			"../../../../src/utils.js": {
				dirExists: t.context.dirExistsStub,
			},
		}
	);

	t.context.createIntegrationCard = createIntegrationCard;
});

// Clean up after each test
test.afterEach.always((t) => {
	t.context.sinon.restore();

	// Restore original environment
	process.env = t.context.originalEnv;
});

test("createIntegrationCard executes successfully", async (t) => {
	const {
		createIntegrationCard, mkdirStub, renderStub,
	} = t.context;
	const folderPath = "/some/folder/path/card";

	const result = await createIntegrationCard({
		folderPath,
		cardType: "List",
		manifestVersion: "1.78.0",
	});

	t.is(mkdirStub.callCount, 4);
	t.deepEqual(mkdirStub.getCall(0).args, [folderPath, {recursive: true}]);
	t.deepEqual(mkdirStub.getCall(1).args, [`${folderPath}/src`.replace(/\//g, path.sep), {recursive: true}]);
	t.deepEqual(mkdirStub.getCall(2).args, [`${folderPath}/src/i18n`.replace(/\//g, path.sep), {recursive: true}]);
	t.deepEqual(mkdirStub.getCall(3).args, [`${folderPath}/test`.replace(/\//g, path.sep), {recursive: true}]);

	// Verify that globby was called with correct parameters
	t.is(t.context.globbyStub.callCount, 1, "globby should be called once");
	t.deepEqual(
		t.context.globbyStub.firstCall.args[0],
		["**", "!**/*.ejs"],
		"globby should be called with correct pattern"
	);
	t.true(t.context.globbyStub.firstCall.args[1].cwd.endsWith("resources/template-card".replace(/\//g, path.sep)));

	// Verify that ejs.render was called with correct parameters
	t.is(renderStub.callCount, t.context.staticFiles.length, "ejs.render should be called for each template file");
	t.context.staticFiles.forEach((file, index) => {
		const templateVars = renderStub.getCall(index).args[1];
		t.deepEqual(templateVars, {
			cardType: "List",
			manifestVersion: "1.78.0",
		});
	});

	t.deepEqual(
		result,
		t.context.staticFiles.map((file) => file.replace(/\//g, path.sep)),
		"Result contains list of generated files"
	);
});

test("Target path already exists", async (t) => {
	const {createIntegrationCard, dirExistsStub, mkdirStub} = t.context;
	const folderPath = "/path/to/dir_that_exists";
	dirExistsStub.resolves(true);
	await t.throwsAsync(async () => {
		await createIntegrationCard({
			folderPath,
			cardType: "List",
			manifestVersion: "1.78.0",
		});
	}, {
		message:
			`The target directory '${folderPath}' already exists. Please choose a ` +
			`different path or remove the existing directory.`,
		instanceOf: InvalidInputError,
	});

	t.true(mkdirStub.notCalled);
});

test("Error creating target directory", async (t) => {
	const {createIntegrationCard, mkdirStub} = t.context;
	const folderPath = "/path/to/dir_with_error";
	const errorMessage = "Simulated mkdir error";
	mkdirStub.rejects(new Error(errorMessage));

	await t.throwsAsync(async () => {
		await createIntegrationCard({
			folderPath,
			cardType: "List",
			manifestVersion: "1.78.0",
		});
	}, {
		message:
			`Failed to create directory '${folderPath}': ` +
			`${errorMessage} ` +
			`Please ensure the path is valid and as intended and you have write permissions.`,
		instanceOf: InvalidInputError,
	});

	t.true(mkdirStub.calledOnce);
	t.deepEqual(mkdirStub.firstCall.args, [folderPath, {recursive: true}]);
});

test("Invalid manifest version", async (t) => {
	const {createIntegrationCard} = t.context;
	const folderPath = "/some/folder/path/card";
	const invalidManifestVersion = "invalid_version";

	await t.throwsAsync(async () => {
		return await createIntegrationCard({
			folderPath,
			cardType: "List",
			manifestVersion: invalidManifestVersion,
		});
	}, {
		message: "The provided manifest version is not valid!",
		instanceOf: InvalidInputError,
	});
});

test("Error processing template file", async (t) => {
	const {createIntegrationCard, readFileStub} = t.context;
	const folderPath = "/some/folder/path/card";
	const errorMessage = "Simulated readFile error";
	readFileStub.rejects(new Error(errorMessage));

	await t.throwsAsync(async () => {
		await createIntegrationCard({
			folderPath,
			cardType: "List",
			manifestVersion: "1.78.0",
		});
	}, {
		message: `Failed to process template file 'src/manifest.json': ${errorMessage}`,
		instanceOf: Error,
	});
});
