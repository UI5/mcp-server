import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {NotFoundError} from "../../../../src/utils.js";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	getProjectInfoStub: sinonGlobal.SinonStub;
	getApiReferenceStub: sinonGlobal.SinonStub;
	createUriForSymbolStub: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/get_api_reference/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stubs for dependencies
	const getProjectInfoStub = t.context.sinon.stub();
	t.context.getProjectInfoStub = getProjectInfoStub;

	const getApiReferenceStub = t.context.sinon.stub().resolves([]);
	t.context.getApiReferenceStub = getApiReferenceStub;

	const createUriForSymbolStub = t.context.sinon.stub();
	t.context.createUriForSymbolStub = createUriForSymbolStub;

	// Import the module with mocked dependencies
	const {default: registerTool} = await esmock("../../../../src/tools/get_api_reference/index.js", {
		"../../../../src/tools/get_project_info/getProjectInfo.js": {
			default: getProjectInfoStub,
		},
		"../../../../src/tools/get_api_reference/getApiReference.js": {
			getApiReference: getApiReferenceStub,
		},
		"../../../../src/tools/get_api_reference/createUriForSymbol.js": {
			default: createUriForSymbolStub,
		},
	});

	t.context.registerTool = registerTool;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerTool registers the tool with correct parameters", (t) => {
	const {registerToolCallback, registerTool} = t.context;

	registerTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "get_api_reference");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.is(toolConfig?.description, "Search the UI5 API reference for module names and symbols");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
});

test("get_api_reference tool returns API reference on success", async (t) => {
	const {
		registerToolCallback, registerTool, getProjectInfoStub, getApiReferenceStub, createUriForSymbolStub, sinon,
	} = t.context;

	// Setup getProjectInfo to return sample project info
	const sampleProjectInfo = {
		projectDir: "/path/to/project",
		projectName: "test-project",
		projectType: "application",
		frameworkName: "SAPUI5",
		frameworkVersion: "1.138.0",
	};
	getProjectInfoStub.resolves(sampleProjectInfo);

	// Setup getApiReference to return sample API reference
	const sampleApiRef = {
		kind: "UI5Class",
		namespace: "sap.m",
		moduleName: "sap.m.Button",
		name: "Button",
		visibility: "public",
	};
	getApiReferenceStub.resolves([sampleApiRef]);

	// Setup createUriForSymbol to return a sample URI
	const sampleUri = "https://ui5.sap.com/1.138.0/#/api/sap.m.Button";
	createUriForSymbolStub.returns(sampleUri);

	// Register the tool and capture the execute function
	const ctx = new TestContext();
	ctx.normalizePath = sinon.stub().resolves("/normalized/path/to/project");
	registerTool(registerToolCallback, ctx);
	const executeFunction = registerToolCallback.firstCall.args[2];

	// Create a mock for the extra parameter
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	// Execute the tool with parameters
	const result = await executeFunction({
		projectDir: "/path/to/project",
		query: "sap.m.Button",
	}, mockExtra);

	// Verify getProjectInfo was called with the correct parameters
	t.true(getProjectInfoStub.calledOnce);
	t.is(getProjectInfoStub.firstCall.args[0], "/normalized/path/to/project",
		"getProjectInfo got called with the normalized path");

	// Verify getApiReference was called with the correct parameters
	t.true(getApiReferenceStub.calledOnce);
	t.is(getApiReferenceStub.firstCall.args[0], "sap.m.Button");
	t.is(getApiReferenceStub.firstCall.args[1], "SAPUI5");
	t.is(getApiReferenceStub.firstCall.args[2], "1.138.0");

	// Verify createUriForSymbol was called with the correct parameters
	t.true(createUriForSymbolStub.calledOnce);
	t.is(createUriForSymbolStub.firstCall.args[0], sampleApiRef);
	t.is(createUriForSymbolStub.firstCall.args[1], "SAPUI5");
	t.is(createUriForSymbolStub.firstCall.args[2], "1.138.0");

	// Verify the result
	t.deepEqual(result, {
		content: [{
			type: "resource",
			resource: {
				text: JSON.stringify(sampleApiRef, null, 2),
				uri: sampleUri,
				mimeType: "application/json",
			},
		}],
	});
});

test("get_api_reference tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerTool, getProjectInfoStub} = t.context;

	// Setup getProjectInfo to throw an error
	const errorMessage = "Failed to get project info";
	getProjectInfoStub.rejects(new Error(errorMessage));

	// Register the tool and capture the execute function
	registerTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	// Create a mock for the extra parameter
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	// Execute the tool and expect it to throw
	await t.throwsAsync(async () => {
		await executeFunction({
			projectDir: "/path/to/project",
			query: "sap.m.Button",
		}, mockExtra);
	}, {message: errorMessage});
});

test("get_api_reference tool passes through NotFoundError", async (t) => {
	const {registerToolCallback, registerTool, getProjectInfoStub} = t.context;

	// Setup getProjectInfo to throw a NotFoundError
	const errorMessage = "NotFound error occurred";
	getProjectInfoStub.rejects(new NotFoundError(errorMessage));

	// Register the tool and capture the execute function
	registerTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	// Create a mock for the extra parameter
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	// Execute the tool and expect it to throw the same NotFoundError
	await t.throwsAsync(async () => {
		await executeFunction({
			projectDir: "/path/to/project",
			query: "sap.m.Button",
		}, mockExtra);
	}, {message: errorMessage, instanceOf: NotFoundError});
});
