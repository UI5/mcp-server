import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	getVersionInfoStub: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/get_version_info/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for getVersionInfo function
	const getVersionInfoStub = t.context.sinon.stub();
	t.context.getVersionInfoStub = getVersionInfoStub;

	// Import the module with mocked dependencies
	const {default: registerTool} = await esmock("../../../../src/tools/get_version_info/index.js", {
		"../../../../src/tools/get_version_info/getVersionInfo.js": {
			default: getVersionInfoStub,
		},
	});

	t.context.registerTool = registerTool;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerTool registers the get_version_info tool with correct parameters", (t) => {
	const {registerToolCallback, registerTool} = t.context;

	registerTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "get_version_info");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.is(toolConfig?.description, "Get version information for UI5 (OpenUI5 or SAPUI5)");
	t.is(toolConfig?.annotations?.title, "UI5 Version Info");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
	t.truthy(toolConfig?.inputSchema);
	t.truthy(toolConfig?.outputSchema);
});

test("get_version_info tool returns version information on success", async (t) => {
	const {registerToolCallback, registerTool, getVersionInfoStub} = t.context;

	// Setup getVersionInfo to return sample content
	const sampleVersionInfo = {
		versions: {
			"1.120": {
				version: "1.120.0",
				support: "Maintenance",
				lts: true,
			},
		},
	};
	getVersionInfoStub.resolves(sampleVersionInfo);

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

	// Execute the tool with a sample parameter
	const params = {frameworkName: "SAPUI5"};
	const result = await executeFunction(params, mockExtra);

	// Verify the result
	t.deepEqual(result, {
		structuredContent: sampleVersionInfo,
		content: [
			{
				type: "text",
				text: JSON.stringify(sampleVersionInfo, null, 2),
			},
		],
	});

	// Verify getVersionInfo was called with the correct parameters
	t.true(getVersionInfoStub.calledOnce);
	t.deepEqual(getVersionInfoStub.firstCall.args[0], params);
});

test("get_version_info tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerTool, getVersionInfoStub} = t.context;

	// Setup getVersionInfo to throw an error
	const errorMessage = "Failed to fetch version information";
	getVersionInfoStub.rejects(new Error(errorMessage));

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
		await executeFunction({frameworkName: "OpenUI5"}, mockExtra);
	}, {message: errorMessage});
});

test("get_version_info tool passes through SoftError", async (t) => {
	const {registerToolCallback, registerTool, getVersionInfoStub} = t.context;

	// Setup getVersionInfo to throw a SoftError
	const errorMessage = "Soft error occurred";
	getVersionInfoStub.rejects(new InvalidInputError(errorMessage));

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

	// Execute the tool and expect it to throw the same SoftError
	await t.throwsAsync(async () => {
		await executeFunction({frameworkName: "SAPUI5"}, mockExtra);
	}, {message: errorMessage, instanceOf: InvalidInputError});
});
