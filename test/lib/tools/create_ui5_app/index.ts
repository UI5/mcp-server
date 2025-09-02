import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	createUi5AppStub: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/create_ui5_app/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for createUi5App function
	const createUi5AppStub = t.context.sinon.stub();
	t.context.createUi5AppStub = createUi5AppStub;

	// Import the module with mocked dependencies
	const {default: registerTool} = await esmock("../../../../src/tools/create_ui5_app/index.js", {
		"../../../../src/tools/create_ui5_app/create_ui5_app.js": {
			createUi5App: createUi5AppStub,
		},
		"../../../../src/tools/create_ui5_app/createSuccessMessage.js": {
			createSuccessMessage: t.context.sinon.stub().returns("Mock success message"),
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
	t.is(registerToolCallback.firstCall.args[0], "create_ui5_app");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.is(toolConfig?.description, "Create a new basic SAPUI5 application implemented in TypeScript or JavaScript");
	t.is(toolConfig?.annotations?.title, "Create SAPUI5 App");
	t.false(toolConfig?.annotations?.readOnlyHint);
});

test("create_ui5_app tool returns success message on success", async (t) => {
	const {registerToolCallback, registerTool, createUi5AppStub, sinon} = t.context;

	// Setup createUi5App to return success
	const successResult = {
		success: true,
		message: "SAPUI5 TypeScript application com.example.app created successfully.",
		finalLocation: "/path/to/app",
		generatedFiles: ["file1.ts", "file2.ts"],
		basePath: "/path/to",
		appInfo: {
			appNamespace: "com.example.app",
			framework: "SAPUI5",
			frameworkVersion: "1.120.0",
			npmInstallExecuted: true,
			gitInitialized: true,
			typescript: true,
			entityProperties: [],
		},
	};
	createUi5AppStub.resolves(successResult);

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

	// Sample parameters for the tool
	const params = {
		appNamespace: "com.example.app",
		basePath: "/path/to",
		createAppDirectory: true,
		framework: "SAPUI5",
		typescript: true,
	};

	// Execute the tool with parameters
	const result = await executeFunction(params, mockExtra);

	// Verify createUi5App was called with the correct parameters
	t.true(createUi5AppStub.calledOnce);
	t.deepEqual(createUi5AppStub.firstCall.args[0], {
		appNamespace: "com.example.app",
		basePath: "/normalized/path/to/project",
		createAppDirectory: true,
		framework: "SAPUI5",
		typescript: true,
		frameworkVersion: undefined,
		initializeGitRepository: undefined,
		oDataEntitySet: undefined,
		oDataV4Url: undefined,
		runNpmInstall: undefined,
	});

	// Verify the result
	t.deepEqual(result, {
		content: [{
			type: "text",
			text: "Mock success message", // This matches what we set up in beforeEach
		}],
	});
});

test("create_ui5_app tool throws error when createUi5App throws", async (t) => {
	const {registerToolCallback, registerTool, createUi5AppStub} = t.context;

	// Setup createUi5App to throw an error
	const errorMessage = "Failed to create UI5 application";
	createUi5AppStub.rejects(new Error(errorMessage));

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

	// Sample parameters for the tool
	const params = {
		appNamespace: "com.example.app",
		basePath: "/path/to",
		createAppDirectory: true,
		framework: "SAPUI5",
		typescript: true,
	};

	// Execute the tool and expect it to throw
	await t.throwsAsync(async () => {
		await executeFunction(params, mockExtra);
	}, {message: errorMessage});
});
