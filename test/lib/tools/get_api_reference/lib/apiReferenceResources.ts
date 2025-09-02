import anyTest, {TestFn} from "ava";
import esmock from "esmock";
import path from "node:path";
import {createFsMocks} from "../../../../utils/fsMocks.js";
import sinonGlobal, {SinonSandbox} from "sinon";
import type {
	_createApiIndex,
	_fetchApiJson,
	ApiReferenceIndex,
	fetchApiJsons,
	getApiJsonDir,
	getLibrariesForVersion,
} from "../../../../../src/tools/get_api_reference/lib/apiReferenceResources.js";
import {Ui5Framework} from "../../../../../src/utils/ui5Framework.js";
import {PassThrough} from "node:stream";
import {fileURLToPath} from "node:url";

async function getMockedModule(sinon: SinonSandbox) {
	const fsMocks = createFsMocks(sinon);
	const apiJsonDir = "/mock/api_json_files";

	// Mock for fetchCdn and fetchCdnRaw
	const fetchCdnStub = sinon.stub();
	const fetchCdnRawStub = sinon.stub();

	// Mock for dirExists
	const dirExistsStub = sinon.stub();

	// Mock for synchronize
	const synchronizeStub = sinon.stub().callsArg(1);

	// Create logger mock
	const loggerMock = {
		silly: sinon.stub(),
		verbose: sinon.stub(),
		perf: sinon.stub(),
		info: sinon.stub(),
		warn: sinon.stub(),
		error: sinon.stub(),
		isLevelEnabled: sinon.stub().returns(true),
	};

	// Mock the module
	const resourcesModule = await esmock(
		"../../../../../src/tools/get_api_reference/lib/apiReferenceResources.js", {
			"../../../../../src/utils/dataStorageHelper.js": {
				getDataDir: () => apiJsonDir,
				synchronize: synchronizeStub,
			},
			"../../../../../src/utils/cdnHelper.js": {
				fetchCdn: fetchCdnStub,
				fetchCdnRaw: fetchCdnRawStub,
			},
			"../../../../../src/utils.js": {
				dirExists: dirExistsStub,
				SoftError: Error,
			},
			"node:stream/promises": {
				finished: sinon.stub().resolves(),
			},
			"@ui5/logger": {
				getLogger: sinon.stub().returns(loggerMock),
				isLogLevelEnabled: sinon.stub().returns(true),
			},
			...fsMocks.modules,
		}
	);

	return {
		getApiJsonDir: resourcesModule.getApiJsonDir,
		fetchApiJsons: resourcesModule.fetchApiJsons,
		_fetchApiJson: resourcesModule._fetchApiJson,
		_createApiIndex: resourcesModule._createApiIndex,
		getLibrariesForVersion: resourcesModule.getLibrariesForVersion,
		fsMocks,
		apiJsonDir,
		fetchCdnStub,
		fetchCdnRawStub,
		dirExistsStub,
		synchronizeStub,
		loggerMock,
	};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getApiJsonDir: typeof getApiJsonDir;
	fetchApiJsons: typeof fetchApiJsons;
	_fetchApiJson: typeof _fetchApiJson;
	_createApiIndex: typeof _createApiIndex;
	getLibrariesForVersion: typeof getLibrariesForVersion;
	fsMocks: ReturnType<typeof createFsMocks>;
	apiJsonDir: string;
	fetchCdnStub: sinonGlobal.SinonStub;
	fetchCdnRawStub: sinonGlobal.SinonStub;
	dirExistsStub: sinonGlobal.SinonStub;
	synchronizeStub: sinonGlobal.SinonStub;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const {
		getApiJsonDir,
		fetchApiJsons,
		_fetchApiJson,
		_createApiIndex,
		getLibrariesForVersion,
		fsMocks,
		apiJsonDir,
		fetchCdnStub,
		fetchCdnRawStub,
		dirExistsStub,
		synchronizeStub,
		loggerMock,
	} = await getMockedModule(t.context.sinon);

	t.context.getApiJsonDir = getApiJsonDir;
	t.context.fetchApiJsons = fetchApiJsons;
	t.context._fetchApiJson = _fetchApiJson;
	t.context._createApiIndex = _createApiIndex;
	t.context.getLibrariesForVersion = getLibrariesForVersion;
	t.context.fsMocks = fsMocks;
	t.context.apiJsonDir = apiJsonDir;
	t.context.fetchCdnStub = fetchCdnStub;
	t.context.fetchCdnRawStub = fetchCdnRawStub;
	t.context.dirExistsStub = dirExistsStub;
	t.context.synchronizeStub = synchronizeStub;
	t.context.loggerMock = loggerMock;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("getApiJsonDir returns cached dir if exists", async (t) => {
	const {getApiJsonDir, dirExistsStub, apiJsonDir} = t.context;

	// Setup: Directory exists
	const frameworkName = "SAPUI5";
	const frameworkVersion = "1.120.0";
	const targetDir = path.join(apiJsonDir, `${frameworkName.toLowerCase()}-${frameworkVersion}`);
	dirExistsStub.withArgs(targetDir).resolves(true);

	const result = await getApiJsonDir(frameworkName, frameworkVersion);
	t.is(result, targetDir);
});

test.serial("getApiJsonDir throws error for invalid framework name", async (t) => {
	const {getApiJsonDir} = t.context;

	await t.throwsAsync(
		async () => getApiJsonDir("invalid" as Ui5Framework, "1.120.0"),
		{message: /Invalid framework name/}
	);
});

test.serial("getApiJsonDir throws error for invalid framework version", async (t) => {
	const {getApiJsonDir} = t.context;

	await t.throwsAsync(
		async () => getApiJsonDir("SAPUI5", "invalid/version"),
		{message: /Invalid framework version/}
	);
});

test.serial("getApiJsonDir fetches API JSONs if directory doesn't exist", async (t) => {
	const {getApiJsonDir, dirExistsStub, apiJsonDir, synchronizeStub} = t.context;

	// Setup: Directory doesn't exist initially, but exists after synchronize
	const frameworkName = "SAPUI5";
	const frameworkVersion = "1.120.0";
	const targetDir = path.join(apiJsonDir, `${frameworkName.toLowerCase()}-${frameworkVersion}`);

	// First check returns false, second check (inside synchronize) returns true
	dirExistsStub.withArgs(targetDir).onFirstCall().resolves(false);
	dirExistsStub.withArgs(targetDir).onSecondCall().resolves(true);

	const result = await getApiJsonDir(frameworkName, frameworkVersion);

	t.is(result, targetDir);
	t.true(synchronizeStub.calledOnce);
});

test.serial("getLibrariesForVersion returns libraries from version.json", async (t) => {
	const {getLibrariesForVersion, fetchCdnStub} = t.context;

	// Setup mock response
	const mockVersionJson = {
		libraries: [
			{name: "sap.ui.core", npmPackageName: "@openui5/sap.ui.core"},
			{name: "sap.m", npmPackageName: "@openui5/sap.m"},
			{name: "themelib_sap_fiori_3", npmPackageName: "@openui5/themelib_sap_fiori_3"},
			{name: "sap.ui.table", npmPackageName: "@openui5/sap.ui.table"},
		],
	};

	fetchCdnStub.resolves(mockVersionJson);

	const result = await getLibrariesForVersion("https://sdk.openui5.org/1.120.0");

	// Should filter out themelib entries
	t.deepEqual(result, ["sap.ui.core", "sap.m", "sap.ui.table"]);
	t.true(fetchCdnStub.calledWith("https://sdk.openui5.org/1.120.0/resources/sap-ui-version.json"));
});

test.serial("_fetchApiJson downloads API JSON file", async (t) => {
	const {_fetchApiJson, fetchCdnRawStub} = t.context;

	// Create a mock stream
	const body = new PassThrough();
	body.end("TEST");

	fetchCdnRawStub.resolves({
		body,
	});

	await _fetchApiJson("/path/to/target.json", "https://example.com/api.json");

	t.true(fetchCdnRawStub.calledWith("https://example.com/api.json"));
});

test.serial("fetchApiJsons fetches API JSONs for all libraries", async (t) => {
	const {fetchApiJsons, fetchCdnStub, fetchCdnRawStub} = t.context;
	const sinon = t.context.sinon;

	// Setup mock responses
	const mockVersionJson = {
		libraries: [
			{name: "sap.ui.core", npmPackageName: "@openui5/sap.ui.core"},
			{name: "sap.m", npmPackageName: "@openui5/sap.m"},
		],
	};

	fetchCdnStub.resolves(mockVersionJson);

	// Create a mock stream
	const body = new PassThrough();
	body.end("TEST");

	// Configure the stub to return a new stream for each call
	fetchCdnRawStub.callsFake(() => {
		return Promise.resolve({
			body,
		});
	});

	await fetchApiJsons("/target/dir", "SAPUI5", "1.120.0");

	// Should have fetched version.json and API JSONs for both libraries
	t.true(fetchCdnStub.calledOnce);
	t.is(fetchCdnRawStub.callCount, 2);

	// Verify URLs for API JSON fetches
	sinon.assert.calledWith(
		fetchCdnRawStub.firstCall,
		"https://ui5.sap.com/1.120.0/test-resources/sap/ui/core/designtime/api.json"
	);
	sinon.assert.calledWith(
		fetchCdnRawStub.secondCall,
		"https://ui5.sap.com/1.120.0/test-resources/sap/m/designtime/api.json"
	);
});

test.serial("fetchApiJsons ignores 404 errors for non-core libraries", async (t) => {
	const {fetchApiJsons, fetchCdnStub, fetchCdnRawStub} = t.context;

	// Setup mock responses
	const mockVersionJson = {
		libraries: [
			{name: "sap.ui.core", npmPackageName: "@openui5/sap.ui.core"},
			{name: "sap.custom", npmPackageName: "@openui5/sap.custom"},
		],
	};

	fetchCdnStub.resolves(mockVersionJson);

	// Create a mock stream for core
	const body = new PassThrough();
	body.end("TEST");

	// Core library succeeds
	fetchCdnRawStub.onFirstCall().resolves({
		body,
	});

	// Custom library fails with 404
	const error = new Error("The requested resource does not exist");
	error.name = "SoftError";
	fetchCdnRawStub.onSecondCall().rejects(error);

	// Should not throw
	await t.notThrowsAsync(
		async () => fetchApiJsons("/target/dir", "SAPUI5", "1.120.0")
	);
});

test.serial("fetchApiJsons throws 404 errors for core library", async (t) => {
	const {fetchApiJsons, fetchCdnStub, fetchCdnRawStub} = t.context;

	// Setup mock responses
	const mockVersionJson = {
		libraries: [
			{name: "sap.ui.core", npmPackageName: "@openui5/sap.ui.core"},
		],
	};

	fetchCdnStub.resolves(mockVersionJson);

	// Core library fails with 404
	const errorMessage = "The requested resource does not exist";
	const error = new Error(errorMessage);
	error.name = "SoftError";
	fetchCdnRawStub.rejects(error);

	// Should throw for core library
	await t.throwsAsync(
		async () => fetchApiJsons("/target/dir", "SAPUI5", "1.120.0"),
		{message: errorMessage}
	);
});

const API_JSON_FIXTURES_DIR = fileURLToPath(
	new URL("../../../../../test/fixtures/api_json_files/openui5-1.120.30", import.meta.url)
);
test.serial("_createApiIndex", async (t) => {
	const {_createApiIndex, fsMocks} = t.context;
	const tmpDir = fileURLToPath(
		new URL("../../../../../test/tmp/api_json_files", import.meta.url)
	);

	await _createApiIndex(tmpDir, [
		path.join(API_JSON_FIXTURES_DIR, "sap.ui.core.api.json"),
		path.join(API_JSON_FIXTURES_DIR, "sap.m.api.json"),
		path.join(API_JSON_FIXTURES_DIR, "sap.ui.table.api.json"),
	]);

	const indexFilePath = path.join(tmpDir, "index.json");
	t.true(fsMocks.files.has(indexFilePath));

	const indexFile = JSON.parse(fsMocks.files.get(indexFilePath)) as ApiReferenceIndex;

	Object.values(indexFile).forEach((entry) => {
		// Normalize paths to POSIX
		entry.filePath = entry.filePath.replace(/\\/g, "/");
	});

	t.snapshot(indexFile);
});

test.serial("_createApiIndex (Duplicate symbols)", async (t) => {
	const {_createApiIndex, fsMocks} = t.context;
	const tmpDir = fileURLToPath(
		new URL("../../../../../test/tmp/api_json_files", import.meta.url)
	);

	await _createApiIndex(tmpDir, [
		path.join(API_JSON_FIXTURES_DIR, "sap.ui.core.api.json"),
		path.join(API_JSON_FIXTURES_DIR, "sap.m.api.json"),
		path.join(API_JSON_FIXTURES_DIR, "sap.ui.table.api.json"),

		// Adding sap.ui.table again to cause duplicates
		path.join(API_JSON_FIXTURES_DIR, "sap.ui.table.api.json"),
	]);

	const indexFilePath = path.join(tmpDir, "index.json");
	t.true(fsMocks.files.has(indexFilePath));

	const indexFile = JSON.parse(fsMocks.files.get(indexFilePath)) as ApiReferenceIndex;

	Object.values(indexFile).forEach((entry) => {
		// Normalize paths to POSIX
		entry.filePath = entry.filePath.replace(/\\/g, "/");
	});

	t.snapshot(indexFile);
});
