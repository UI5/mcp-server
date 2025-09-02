import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	getProjectInfoStub: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/get_project_info/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for getProjectInfo function
	const getProjectInfoStub = t.context.sinon.stub();
	t.context.getProjectInfoStub = getProjectInfoStub;

	// Import the module with mocked dependencies
	const {default: registerTool} = await esmock("../../../../src/tools/get_project_info/index.js", {
		"../../../../src/tools/get_project_info/getProjectInfo.js": {
			default: getProjectInfoStub,
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
	t.is(registerToolCallback.firstCall.args[0], "get_project_info");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.is(toolConfig?.description, "Get general information about a local UI5 project.");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
});

test("get_project_info tool returns project info on success", async (t) => {
	const {registerToolCallback, registerTool, getProjectInfoStub, sinon} = t.context;

	// Setup getProjectInfo to return sample content
	const sampleProjectInfo = {
		projectDir: "/path/to/project",
		projectName: "test-project",
		projectType: "application",
		frameworkName: "SAPUI5",
		frameworkVersion: "1.138.0",
		frameworkLibraries: ["sap.m", "sap.ui.core"],
	};
	getProjectInfoStub.resolves(sampleProjectInfo);

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

	// Execute the tool with a projectDir parameter
	const result = await executeFunction({projectDir: "/path/to/project"}, mockExtra);

	// Verify getProjectInfo was called with the correct parameters
	t.true(getProjectInfoStub.calledOnce);
	t.is(getProjectInfoStub.firstCall.args[0], "/normalized/path/to/project",
		"getProjectInfo got called with the normalized path");
	t.is(getProjectInfoStub.firstCall.args[1], true);

	// Verify the result
	t.deepEqual(result, {
		structuredContent: sampleProjectInfo,
		content: [
			{
				type: "text",
				text: JSON.stringify(sampleProjectInfo, null, 2),
			},
		],
	});
});

test("get_project_info tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerTool, getProjectInfoStub} = t.context;

	// Setup getProjectInfo to throw an error
	const errorMessage = "Failed to find project";
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
		await executeFunction({projectDir: "/path/to/project"}, mockExtra);
	}, {message: errorMessage});
});

test("get_project_info tool passes through SoftError", async (t) => {
	const {registerToolCallback, registerTool, getProjectInfoStub} = t.context;

	// Setup getProjectInfo to throw a SoftError
	const errorMessage = "Soft error occurred";
	getProjectInfoStub.rejects(new InvalidInputError(errorMessage));

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
		await executeFunction({projectDir: "/path/to/project"}, mockExtra);
	}, {message: errorMessage, instanceOf: InvalidInputError});
});
