import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import TestContext from "../../../utils/TestContext.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	searchDocsStub: sinonGlobal.SinonStub;
	registerSearchUi5DocsTool: typeof import("../../../../src/tools/search_ui5_docs/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	t.context.registerToolCallback = t.context.sinon.stub();

	const searchDocsStub = t.context.sinon.stub();
	t.context.searchDocsStub = searchDocsStub;

	const {default: registerSearchUi5DocsTool} = await esmock("../../../../src/tools/search_ui5_docs/index.js", {
		"../../../../src/tools/search_ui5_docs/search.js": {
			searchDocs: searchDocsStub,
		},
	});

	t.context.registerSearchUi5DocsTool = registerSearchUi5DocsTool;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerSearchUi5DocsTool registers the tool with correct parameters", (t) => {
	const {registerToolCallback, registerSearchUi5DocsTool} = t.context;

	registerSearchUi5DocsTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "search_ui5_docs");

	const toolConfig = registerToolCallback.firstCall.args[1];
	t.true(toolConfig?.description?.includes("Search UI5 documentation"));
	t.is(toolConfig?.annotations?.title, "Search UI5 Documentation");
	t.true(toolConfig?.annotations?.readOnlyHint);
	t.true(toolConfig?.annotations?.idempotentHint);
	t.false(toolConfig?.annotations?.openWorldHint);
});

test("search_ui5_docs tool returns search results", async (t) => {
	const {registerToolCallback, registerSearchUi5DocsTool, searchDocsStub} = t.context;

	const mockResults = [
		{score: 0.95, source: "Button API", summary: "Button control", code: "new Button()"},
		{score: 0.85, source: "Input API", summary: "Input control", code: "new Input()"},
	];
	searchDocsStub.resolves(mockResults);

	registerSearchUi5DocsTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	const result = await executeFunction({query: "button", limit: 2}, mockExtra);

	t.true(searchDocsStub.calledOnceWith("button", 2));
	t.is(result.content.length, 1);
	t.is(result.content[0].type, "text");
	t.true(result.content[0].text.includes("Found 2 results"));
	t.true(result.content[0].text.includes("Button API"));
	t.true(result.content[0].text.includes("0.950"));
});

test("search_ui5_docs tool passes limit to searchDocs", async (t) => {
	const {registerToolCallback, registerSearchUi5DocsTool, searchDocsStub} = t.context;

	searchDocsStub.resolves([]);

	registerSearchUi5DocsTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	// Note: zod schema provides default of 5, but test bypasses schema validation
	await executeFunction({query: "test", limit: 10}, mockExtra);

	t.true(searchDocsStub.calledOnceWith("test", 10));
});

test("search_ui5_docs tool handles errors", async (t) => {
	const {registerToolCallback, registerSearchUi5DocsTool, searchDocsStub} = t.context;

	searchDocsStub.rejects(new Error("Embeddings not found"));

	registerSearchUi5DocsTool(registerToolCallback, new TestContext());
	const executeFunction = registerToolCallback.firstCall.args[2];

	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	await t.throwsAsync(async () => {
		await executeFunction({query: "test"}, mockExtra);
	}, {message: "Embeddings not found"});
});
