import anyTest, {TestFn} from "ava";
import path from "node:path";
import esmock from "esmock";
import sinonGlobal from "sinon";
import {fileURLToPath} from "url";
import {InvalidInputError} from "../../../../src/utils.js";
import {CreateUi5AppParams} from "../../../../src/api.js";
import ODataMetadata from "../../../../src/tools/create_ui5_app/ODataMetadata.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define test context type
const test = anyTest as TestFn<{
	staticParams: CreateUi5AppParams;
	mkdirStub: sinonGlobal.SinonStub;
	dirExists: sinonGlobal.SinonStub;
	processTemplatesStub: sinonGlobal.SinonStub;
	getLatestUi5VersionStub: sinonGlobal.SinonStub;
	odataMetadataLoadStub: sinonGlobal.SinonStub;
	execaStub: sinonGlobal.SinonStub;
	mockOdataMetadata: sinonGlobal.SinonStubbedInstance<ODataMetadata>;
	sinon: sinonGlobal.SinonSandbox;
	originalEnv: NodeJS.ProcessEnv;
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

const targetDir = path.join(process.cwd(), "test", "tmp", "target_dir");

// Setup test context before each test
test.beforeEach(async (t) => {
	// Create a sandbox for sinon stubs
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.originalEnv = {...process.env};

	t.context.staticParams = {
		appNamespace: "my.namespace",
		framework: "SAPUI5",
		frameworkVersion: "1.136.0",
		basePath: targetDir,
		createAppDirectory: true,
		initializeGitRepository: false,
		runNpmInstall: false,
	};

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

	t.context.getLatestUi5VersionStub = t.context.sinon.stub().resolves("1.136.0");
	t.context.processTemplatesStub = t.context.sinon.stub();

	t.context.mockOdataMetadata = t.context.sinon.createStubInstance(ODataMetadata);
	t.context.odataMetadataLoadStub = t.context.sinon.stub().resolves(t.context.mockOdataMetadata);

	t.context.execaStub = t.context.sinon.stub().resolves({
		exitCode: 0,
		stdout: "",
		stderr: "",
	});

	t.context.mkdirStub = t.context.sinon.stub().resolves();
	t.context.dirExists = t.context.sinon.stub().resolves(false);

	// Mock the @ui5/logger module
	const {createUi5App} = await esmock("../../../../src/tools/create_ui5_app/create_ui5_app.js", {
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
			isLogLevelEnabled: t.context.sinon.stub().returns(true),
		},
		"execa": {
			execa: t.context.execaStub,
		},
		"fs/promises": {
			mkdir: t.context.mkdirStub,
		},
		"../../../../src/tools/create_ui5_app/ui5Version.js": {
			getLatestUi5Version: t.context.getLatestUi5VersionStub,
		},
		"../../../../src/tools/create_ui5_app/templateProcessor.js": {
			processTemplates: t.context.processTemplatesStub,
		},
		"../../../../src/tools/create_ui5_app/ODataMetadata.js": {
			default: {
				load: t.context.odataMetadataLoadStub,
			},
		},
		"../../../../src/utils.js": {
			dirExists: t.context.dirExists,
		},
	});

	t.context.createUi5App = createUi5App;
});

// Clean up after each test
test.afterEach.always((t) => {
	t.context.sinon.restore();

	// Restore original environment
	process.env = t.context.originalEnv;
});

test("All parameters", async (t) => {
	const {
		createUi5App, mkdirStub, mockOdataMetadata, processTemplatesStub, getLatestUi5VersionStub,
		odataMetadataLoadStub, execaStub,
	} = t.context;
	mockOdataMetadata.getEntitySet.returns({
		name: "Products",
		properties: [
			{name: "ID", type: "Edm.String"},
			{name: "Name", type: "Edm.String"},
			{name: "Price", type: "Edm.Decimal"},
		],
		namespace: "com.test.apiapp",
		keys: ["ID"],
	});

	const result = await createUi5App({
		appNamespace: "com.test.apiapp",
		framework: "SAPUI5",
		frameworkVersion: "1.136.0",
		author: "API Test",
		basePath: targetDir,
		oDataV4Url: "https://localhost/odata/v4/service",
		oDataEntitySet: "Products",
		createAppDirectory: true,
		initializeGitRepository: true,
		runNpmInstall: true,
		typescript: true,
	});

	t.is(mkdirStub.callCount, 2, "mkdir should be called twice");

	t.true(processTemplatesStub.calledOnce);
	const templateVars = processTemplatesStub.firstCall.firstArg;
	t.is(templateVars.templateDir, path.join(__dirname, "..", "..", "..", "..", "resources", "template-ts"));
	delete templateVars.templateDir;
	t.deepEqual(templateVars, {
		targetDir: path.join(targetDir, "com.test.apiapp"),
		templateVars: {
			appId: "com.test.apiapp",
			appURI: "com/test/apiapp",
			author: "API Test",
			cdnDomain: "ui5.sap.com",
			defaultTheme: "sap_horizon",
			entityProperties: [],
			framework: "SAPUI5",
			frameworkVersion: "1.136.0",
			gte1_100_0: true,
			gte1_104_0: true,
			gte1_115_0: true,
			gte1_120_0: true,
			gte1_98_0: true,
			lt1_110_0: false,
			lt1_124_0: false,
			namespace: "com.test.apiapp",
			oDataEntitySet: "Products",
			oDataV4Url: "https://localhost/odata/v4/service/",
			qunitCoverageFile: "qunit-coverage-istanbul.js",
			serverRequiresXCSRF: false,
			tstypes: "@sapui5/types",
			tstypesVersion: "1.136.0",
		},
		versionSpecificLogic: {
			lt1_124_0: false,
		},
	});

	t.true(getLatestUi5VersionStub.notCalled);

	t.true(odataMetadataLoadStub.calledOnce);
	t.is(odataMetadataLoadStub.firstCall.firstArg, "https://localhost/odata/v4/service");

	t.is(execaStub.callCount, 4);
	t.deepEqual(execaStub.firstCall.args, [
		"npm", ["install"], {
			cwd: path.join(targetDir, "com.test.apiapp"),
			stdout: process.stderr,
		},
	]);
	t.deepEqual(execaStub.secondCall.args, [
		"git", ["init", "--quiet"], {
			cwd: path.join(targetDir, "com.test.apiapp"),
			stdout: process.stderr,
		},
	]);
	t.deepEqual(execaStub.thirdCall.args, [
		"git", ["add", "."], {
			cwd: path.join(targetDir, "com.test.apiapp"),
			stdout: process.stderr,
		},
	]);
	t.deepEqual(execaStub.getCall(3).args, [
		"git", ["commit", "--quiet", "--allow-empty", "-m", "Initial commit"], {
			cwd: path.join(targetDir, "com.test.apiapp"),
			stdout: process.stderr,
		},
	]);

	t.deepEqual(result, {
		appInfo: {
			appNamespace: "com.test.apiapp",
			entityProperties: [],
			finalODataV4Url: "https://localhost/odata/v4/service/",
			framework: "SAPUI5",
			frameworkVersion: "1.136.0",
			gitInitialized: true,
			npmInstallExecuted: true,
			oDataEntitySet: "Products",
			typescript: true,
		},
		basePath: targetDir,
		finalLocation: path.join(targetDir, "com.test.apiapp"),
		generatedFiles: undefined,
		message: "SAPUI5 TypeScript application com.test.apiapp created successfully.",
	});
});

test("Invalid framework name", async (t) => {
	const {createUi5App, mkdirStub, execaStub} = t.context;
	await t.throwsAsync(async () => {
		return await createUi5App({
			appNamespace: "my.namespace",
			framework: "InvalidFramework" as "OpenUI5", // Invalid framework
			frameworkVersion: "1.136.0",
			basePath: targetDir,
			createAppDirectory: true,
			initializeGitRepository: false,
			runNpmInstall: false,
		});
	}, {
		message: /The provided framework is not valid!/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("Invalid framework version", async (t) => {
	const {createUi5App, mkdirStub, execaStub} = t.context;
	await t.throwsAsync(async () => {
		return await createUi5App({
			appNamespace: "my.namespace",
			framework: "SAPUI5",
			frameworkVersion: "xyz-version", // Invalid version
			basePath: targetDir,
			createAppDirectory: true,
			initializeGitRepository: false,
			runNpmInstall: false,
		});
	}, {
		message: /The provided framework version is not valid!/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("Invalid relative base path", async (t) => {
	const {createUi5App, mkdirStub, execaStub} = t.context;
	await t.throwsAsync(async () => {
		return await createUi5App({
			appNamespace: "my.namespace",
			framework: "SAPUI5",
			frameworkVersion: "1.136.0",
			basePath: "../relative-path",
			createAppDirectory: true,
			initializeGitRepository: false,
			runNpmInstall: false,
		});
	}, {
		message: /The provided base path is not valid!/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("Framework version defaults to latest SAPUI5 version", async (t) => {
	const {createUi5App, getLatestUi5VersionStub, staticParams} = t.context;
	delete staticParams.framework;
	delete staticParams.frameworkVersion;

	const res = await createUi5App(staticParams);

	t.true(getLatestUi5VersionStub.calledOnce);
	t.is(getLatestUi5VersionStub.firstCall.firstArg, "SAPUI5");

	t.is(res.appInfo?.framework, "SAPUI5");
	t.is(res.appInfo?.frameworkVersion, "1.136.0");
});

test("OData V4 Service URL: Path becomes prefixed with localhost", async (t) => {
	const {createUi5App, odataMetadataLoadStub, staticParams, processTemplatesStub} = t.context;

	const res = await createUi5App({
		...staticParams,
		oDataV4Url: "/absolute-path",
	});

	t.is(odataMetadataLoadStub.firstCall.firstArg, "http://localhost:4004/absolute-path",
		"Localhost was appended to path");
	t.is(processTemplatesStub.firstCall.firstArg.templateVars.oDataV4Url, "/absolute-path/");
	t.is(res.appInfo?.finalODataV4Url, "/absolute-path/");
});

test("OData V4 Service URL: odata.org is in allow list", async (t) => {
	const {createUi5App, odataMetadataLoadStub, staticParams, processTemplatesStub} = t.context;

	const res = await createUi5App({
		...staticParams,
		oDataV4Url: "https://services.odata.org/TripPinRESTierService/(S(s5xrj1t51r4cs3ooztsymysq))/",
	});

	t.is(odataMetadataLoadStub.firstCall.firstArg, "https://services.odata.org/TripPinRESTierService/(S(s5xrj1t51r4cs3ooztsymysq))/",
		"Localhost was appended to path");
	t.is(processTemplatesStub.firstCall.firstArg.templateVars.oDataV4Url, "https://services.odata.org/TripPinRESTierService/(S(s5xrj1t51r4cs3ooztsymysq))/");
	t.is(res.appInfo?.finalODataV4Url, "https://services.odata.org/TripPinRESTierService/(S(s5xrj1t51r4cs3ooztsymysq))/");
});

test("OData V4 Service URL: http://localhost:4004/absolute-path", async (t) => {
	const {createUi5App, odataMetadataLoadStub, staticParams, processTemplatesStub} = t.context;

	const res = await createUi5App({
		...staticParams,
		oDataV4Url: "http://localhost:4004/absolute-path",
	});

	t.is(odataMetadataLoadStub.firstCall.firstArg, "http://localhost:4004/absolute-path",
		"Localhost was appended to path");
	t.is(processTemplatesStub.firstCall.firstArg.templateVars.oDataV4Url, "/absolute-path/");
	t.is(res.appInfo?.finalODataV4Url, "/absolute-path/");
});

test("OData V4 Service URL: Not a URL or abosolute path", async (t) => {
	const {createUi5App, mkdirStub, execaStub, staticParams} = t.context;
	await t.throwsAsync(async () => {
		return await createUi5App({
			...staticParams,
			oDataV4Url: "invalid-url", // Invalid URL
		});
	}, {
		message: `The provided OData V4 service URL is not valid. It must be either an absolute URL` +
			`starting with http:// or https:// or pathname like '/odata/v4/serviceName' in case ` +
			`the OData service is exposed on the same server as the application. In this case, ` +
			`the protocol and host 'http://localhost:4004' will be assumed and used by this tool for inquiries ` +
			`about the service. ` +
			`As per the MCP server configuration, only the following domains are currently allowed: ` +
			`'localhost', 'services.odata.org'. See https://github.com/UI5/mcp-server#configuration ` +
			`for information on how to configure the allow list.`,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("OData V4 Service URL: Invalid URL protocol", async (t) => {
	const {createUi5App, mkdirStub, execaStub, staticParams} = t.context;

	await t.throwsAsync(async () => {
		return await createUi5App({
			...staticParams,
			oDataV4Url: "ftp://localhost/path",
		});
	}, {
		message: /The provided OData V4 service URL is not valid/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("OData V4 Service URL: Not in allow list", async (t) => {
	const {createUi5App, mkdirStub, execaStub, staticParams} = t.context;

	await t.throwsAsync(async () => {
		return await createUi5App({
			...staticParams,
			oDataV4Url: "https://example.com/odata/v4/service",
		});
	}, {
		message: /Domain "example.com" is not allowed/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test.serial("OData V4 Service URL: Custom allow list", async (t) => {
	const {createUi5App, mkdirStub, execaStub, staticParams} = t.context;

	process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS = "  .example.com, ui5.sap.com  ";

	await t.throwsAsync(async () => {
		return await createUi5App({
			...staticParams,
			oDataV4Url: "https://localhost/odata/v4/service",
		});
	}, {
		message: /Domain "localhost" is not allowed/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);

	await t.notThrowsAsync(async () => {
		await createUi5App({
			...staticParams,
			oDataV4Url: "https://www.example.com/odata/v4/service",
		});
	});

	await t.notThrowsAsync(async () => {
		await createUi5App({
			...staticParams,
			oDataV4Url: "https://ui5.sap.com/odata/v4/service",
		});
	});
});

test.serial("OData V4 Service URL: Invalid entry in allow list", async (t) => {
	const {createUi5App, mkdirStub, execaStub, staticParams} = t.context;

	process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS = "ex ample.com, ui5/.sap.com  ";

	await t.throwsAsync(async () => {
		return await createUi5App({
			...staticParams,
			oDataV4Url: "https://localhost/odata/v4/service",
		});
	}, {
		message: /Invalid domain 'ex ample.com' in UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS: Invalid URL/,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.notCalled);
	t.true(execaStub.notCalled);
});

test("OData V4 Service URL: Quotes are escaped correctly for templating", async (t) => {
	const {createUi5App, odataMetadataLoadStub, staticParams, processTemplatesStub} = t.context;

	const res = await createUi5App({
		...staticParams,
		// Quotes in the value might break the templating
		oDataV4Url: `http://localhost:4004/service/value wi\\th "special_chars/`,
	});

	t.is(odataMetadataLoadStub.firstCall.firstArg, `http://localhost:4004/service/value wi\\th "special_chars/`);
	t.is(processTemplatesStub.firstCall.firstArg.templateVars.oDataV4Url,
		`/service/value wi\\\\th \\"special_chars/`);
	t.is(res.appInfo?.finalODataV4Url, `/service/value wi\\th "special_chars/`);
});

test("Target path already exists", async (t) => {
	const {createUi5App, dirExists, mkdirStub, execaStub} = t.context;
	dirExists.resolves(true);
	await t.throwsAsync(async () => {
		return await createUi5App({
			appNamespace: "dir_that_exists",
			framework: "SAPUI5",
			frameworkVersion: "1.136.0",
			basePath: targetDir,
			createAppDirectory: true,
			initializeGitRepository: false,
			runNpmInstall: false,
		});
	}, {
		message:
			`Target directory '${path.join(targetDir, "dir_that_exists")}' already exists. Please choose a ` +
			`different namespace or base path or remove the existing directory.`,
		instanceOf: InvalidInputError,
	});
	t.true(mkdirStub.calledOnce);
	t.true(execaStub.notCalled);
});
