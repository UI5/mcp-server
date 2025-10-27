import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import TestContext from "../../../utils/TestContext.js";
import esmock from "esmock";
import path from "path";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	createIntegrationCard: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/create_integration_card/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	t.context.registerToolCallback = t.context.sinon.stub();

	const createIntegrationCardStub = t.context.sinon.stub();
	t.context.createIntegrationCard = createIntegrationCardStub;

	t.context.registerTool = (await esmock("../../../../src/tools/create_integration_card/index.js", {
		"../../../../src/tools/create_integration_card/create_integration_card.js": {
			createIntegrationCard: createIntegrationCardStub,
		},
		"../../../../src/utils/ui5Manifest.js": {
			getLatestManifestVersion: t.context.sinon.stub().resolves("1.78.0"),
		},
	}));
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("registerTool registers the tool with correct parameters", (t) => {
	const {registerToolCallback, registerTool} = t.context;

	registerTool(registerToolCallback, new TestContext());

	t.true(registerToolCallback.calledOnce);
	t.is(registerToolCallback.firstCall.args[0], "create_integration_card");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.is(toolConfig.title, "Create Integration Card");
	t.is(toolConfig.description, "Create a new Integration Card, UI Integration Card, or UI5 Integration Card");
	t.is(toolConfig.annotations?.title, "Create Integration Card");
	t.false(toolConfig.annotations?.readOnlyHint);
});

test("create_integration_card tool returns success message on success", async (t) => {
	const {registerToolCallback, registerTool, createIntegrationCard} = t.context;
	const generatedFiles = [
		"src/manifest.json",
		"src/i18n/i18n.properties",
		"test/index.html",
	];
	createIntegrationCard.resolves(generatedFiles);

	const ctx = new TestContext();
	registerTool(registerToolCallback, ctx);
	const executeFunction = registerToolCallback.firstCall.args[2];
	const params = {
		basePath: "/projects/mycards".replace(/\//g, path.sep),
		cardFolderName: "mycard",
		cardType: "List",
	};
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};
	const result = await executeFunction(params, mockExtra);

	t.true(createIntegrationCard.calledOnce);
	t.deepEqual(createIntegrationCard.firstCall.args, [{
		folderPath: "/projects/mycards/mycard".replace(/\//g, path.sep),
		cardType: "List",
		manifestVersion: "1.78.0",
	}]);

	const message = `Successfully created Integration Card ${params.cardFolderName} at ${params.basePath}\n` +
		`The generated files inside ${path.join(params.basePath, params.cardFolderName)} are:\n` +
		generatedFiles.join("\n");

	t.deepEqual(result, {
		content: [{
			type: "text",
			text: message,
		}],
	});
});

test("create_integration_card tool throws error on failure", async (t) => {
	const {registerToolCallback, registerTool, createIntegrationCard} = t.context;
	createIntegrationCard.rejects(new Error("Simulated failure"));

	const ctx = new TestContext();
	registerTool(registerToolCallback, ctx);
	const executeFunction = registerToolCallback.firstCall.args[2];
	const params = {
		basePath: "/projects/mycards".replace(/\//g, path.sep),
		cardFolderName: "mycard",
		cardType: "List",
	};
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	await t.throwsAsync(
		async () => {
			await executeFunction(params, mockExtra);
		},
		{
			message: "Simulated failure",
		}
	);
});

test("create_integration_card tool throws error if card folder is outside base path", async (t) => {
	const {registerToolCallback, registerTool} = t.context;

	const ctx = new TestContext();
	registerTool(registerToolCallback, ctx);
	const executeFunction = registerToolCallback.firstCall.args[2];
	const basePath = "/projects/mycards".replace(/\//g, path.sep);
	const cardFolderName = "../otherdir/mycard".replace(/\//g, path.sep);
	const params = {
		basePath,
		cardFolderName,
		cardType: "List",
	};
	const mockExtra = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: t.context.sinon.stub(),
		sendRequest: t.context.sinon.stub(),
	};

	await t.throwsAsync(
		async () => {
			await executeFunction(params, mockExtra);
		},
		{
			message: `Card folder path ${path.join(basePath, cardFolderName)} is not within base path ${basePath}`,
		}
	);
});
