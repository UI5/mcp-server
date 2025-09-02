import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	getGuidelinesStub: sinonGlobal.SinonStub;
	registerGetGuidelinesTool: typeof import("../../../../src/tools/get_guidelines/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for getGuidelines function
	const getGuidelinesStub = t.context.sinon.stub();
	t.context.getGuidelinesStub = getGuidelinesStub;

	// Import the module with mocked dependencies
	const {default: registerGetGuidelinesTool} = await esmock("../../../../src/tools/get_guidelines/index.js", {
		"../../../../src/tools/get_guidelines/guidelines.js": {
			getGuidelines: getGuidelinesStub,
		},
	});

	t.context.registerGetGuidelinesTool = registerGetGuidelinesTool;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerGetGuidelinesTool registers the tool with correct parameters", (t) => {
	const {registerToolCallback, registerGetGuidelinesTool} = t.context;

	registerGetGuidelinesTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "get_guidelines");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.true(toolConfig?.description?.includes("UI5 guidelines"));
	t.is(toolConfig?.annotations?.title, "Get UI5 Guidelines");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
	t.false(toolConfig?.annotations?.openWorldHint);
});

test("get_guidelines tool returns guidelines content on success", async (t) => {
	const {registerToolCallback, registerGetGuidelinesTool, getGuidelinesStub} = t.context;

	// Setup getGuidelines to return sample content
	const sampleGuidelines = "# UI5 Guidelines\n\nSample content";
	getGuidelinesStub.resolves(sampleGuidelines);

	// Register the tool and capture the execute function
	registerGetGuidelinesTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	// Create a mock for the extra parameter
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	// Execute the tool
	const result = await executeFunction({}, mockExtra);

	// Verify the result
	t.deepEqual(result, {
		content: [
			{
				type: "text",
				text: sampleGuidelines,
			},
		],
	});
});

test("get_guidelines tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerGetGuidelinesTool, getGuidelinesStub} = t.context;

	// Setup getGuidelines to throw an error
	const errorMessage = "Failed to read guidelines file";
	getGuidelinesStub.rejects(new Error(errorMessage));

	// Register the tool and capture the execute function
	registerGetGuidelinesTool(registerToolCallback, new TestContext());
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
		await executeFunction({}, mockExtra);
	}, {message: errorMessage});
});

test("get_guidelines tool passes through SoftError", async (t) => {
	const {registerToolCallback, registerGetGuidelinesTool, getGuidelinesStub} = t.context;

	// Setup getGuidelines to throw a SoftError
	const errorMessage = "Soft error occurred";
	getGuidelinesStub.rejects(new InvalidInputError(errorMessage));

	// Register the tool and capture the execute function
	registerGetGuidelinesTool(registerToolCallback, new TestContext());
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
		await executeFunction({}, mockExtra);
	}, {message: errorMessage, instanceOf: InvalidInputError});
});
