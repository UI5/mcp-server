import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	getGuidelinesStub: sinonGlobal.SinonStub;
	registerGetIntegrationCardsGuidelinesTool: typeof import(
		"../../../../src/tools/get_integration_cards_guidelines/index.js"
	).default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for getGuidelines function
	const getGuidelinesStub = t.context.sinon.stub();
	t.context.getGuidelinesStub = getGuidelinesStub;

	// Import the module with mocked dependencies
	const {default: registerGetGuidelinesTool} = await esmock(
		"../../../../src/tools/get_integration_cards_guidelines/index.js", {
			"../../../../src/tools/get_integration_cards_guidelines/guidelines.js": {
				getGuidelines: getGuidelinesStub,
			},
		}
	);

	t.context.registerGetIntegrationCardsGuidelinesTool = registerGetGuidelinesTool;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerGetIntegrationCardsGuidelinesTool registers the tool with correct parameters", (t) => {
	const {registerToolCallback, registerGetIntegrationCardsGuidelinesTool: registerGetGuidelinesTool} = t.context;

	registerGetGuidelinesTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "get_integration_cards_guidelines");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.true(toolConfig?.title?.includes("Get Integration Cards Guidelines"));
	t.true(toolConfig?.description?.includes("Integration Cards guidelines"));
	t.is(toolConfig?.annotations?.title, "Get Integration Cards Guidelines");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
	t.false(toolConfig?.annotations?.openWorldHint);
});

test("get_integration_cards_guidelines tool returns guidelines content on success", async (t) => {
	const {
		registerToolCallback,
		registerGetIntegrationCardsGuidelinesTool: registerGetGuidelinesTool,
		getGuidelinesStub,
	} = t.context;

	// Setup getGuidelines to return sample content
	const sampleGuidelines = "# UI Integration Cards Guidelines\n\nSample content";
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

test("get_integration_cards_guidelines tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerGetIntegrationCardsGuidelinesTool, getGuidelinesStub} = t.context;

	// Setup getGuidelines to throw an error
	const errorMessage = "Failed to read guidelines file";
	getGuidelinesStub.rejects(new Error(errorMessage));

	// Register the tool and capture the execute function
	registerGetIntegrationCardsGuidelinesTool(registerToolCallback, new TestContext());
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
