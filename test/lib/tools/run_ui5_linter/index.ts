import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";
import TestContext from "../../../utils/TestContext.js";
import {EmbeddedResource} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";
import {pathToFileURL} from "node:url";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerToolCallback: sinonGlobal.SinonStub;
	runUi5LinterStub: sinonGlobal.SinonStub;
	registerTool: typeof import("../../../../src/tools/run_ui5_linter/index.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.registerToolCallback = t.context.sinon.stub();

	// Create stub for runUi5Linter function
	const runUi5LinterStub = t.context.sinon.stub();
	t.context.runUi5LinterStub = runUi5LinterStub;

	// Import the module with mocked dependencies
	const {default: registerTool} = await esmock("../../../../src/tools/run_ui5_linter/index.js", {
		"../../../../src/tools/run_ui5_linter/runUi5Linter.js": {
			default: runUi5LinterStub,
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
	t.is(registerToolCallback.firstCall.args[0], "run_ui5_linter");

	// Verify tool configuration
	const toolConfig = registerToolCallback.firstCall.args[1];
	t.true(toolConfig?.description?.includes("Run UI5 linter on a UI5 project"));
	t.is(toolConfig?.annotations?.title, "UI5 linter");
	t.false(toolConfig?.annotations?.readOnlyHint);
});

test("run_ui5_linter tool returns linting results on success with no context information", async (t) => {
	const {registerToolCallback, registerTool, runUi5LinterStub, sinon} = t.context;

	// Setup runUi5Linter to return sample results
	const sampleResults = {
		projectDir: "/path/to/project",
		frameworkVersion: "1.138.0",
		results: [
			{
				filePath: "/path/to/project/webapp/Component.js",
				messages: [
					{
						ruleId: "no-deprecated-api",
						severity: 2,
						line: 10,
						column: 5,
						message: "Usage of deprecated API: sap.ui.getCore()",
					},
				],
			},
		],
	};
	runUi5LinterStub.resolves(sampleResults);

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
		fix: false,
		provideContextInformation: false,
	}, mockExtra);

	// Verify runUi5Linter was called with the correct parameters
	t.true(runUi5LinterStub.calledOnce);
	t.deepEqual(runUi5LinterStub.firstCall.args[0], {
		projectDir: "/normalized/path/to/project",
		fix: false,
		provideContextInformation: false,
		filePatterns: undefined,
	});

	// Verify the result
	t.deepEqual(result, {
		structuredContent: sampleResults,
		content: [
			{
				type: "text",
				text: JSON.stringify(sampleResults.results, null, 2),
			},
		],
	});
});

test("run_ui5_linter tool returns linting results with context information", async (t) => {
	const {registerToolCallback, registerTool, runUi5LinterStub} = t.context;

	const projectDir = path.join(process.cwd(), "test", "tmp", "test-project");

	// Setup runUi5Linter to return sample results with context information
	const sampleResults = {
		projectDir,
		frameworkVersion: "1.138.0",
		results: [
			{
				filePath: path.join(projectDir, "webapp", "Component.js"),
				messages: [
					{
						ruleId: "no-deprecated-api",
						severity: 2,
						line: 10,
						column: 5,
						message: "Usage of deprecated API: sap.ui.getCore()",
					},
				],
			},
		],
		contextInformation: {
			ruleDescriptions: [
				{
					ruleId: "no-deprecated-api",
					description: "Disallows usage of deprecated UI5 APIs",
				},
			],
			migrationGuides: [
				{
					title: "How to fix deprecated API usage",
					text: "# How to fix deprecated API usage\n\nUse alternative APIs...",
					uri: "fix-hints/deprecated-api.md",
				},
			],
			apiReferences: [
				{
					name: "sap.ui.getCore",
					deprecated: true,
					alternative: "sap.ui.core.Core.get",
				},
			],
			documentationResources: [
				{
					title: "Deprecated APIs",
					text: "# Deprecated APIs\n\nThis document explains...",
					uri: "https://ui5.sap.com/deprecated-apis",
				},
			],
		},
	};
	runUi5LinterStub.resolves(sampleResults);

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

	// Execute the tool with parameters
	const result = await executeFunction({
		projectDir,
		fix: false,
		provideContextInformation: true,
	}, mockExtra);

	// Verify runUi5Linter was called with the correct parameters
	t.true(runUi5LinterStub.calledOnce);
	t.deepEqual(runUi5LinterStub.firstCall.args[0], {
		projectDir,
		fix: false,
		provideContextInformation: true,
		filePatterns: undefined,
	});

	// Verify the result structure
	t.is(result.structuredContent, sampleResults);
	t.is(result.content.length, 5); // text + apiReferences + fixHint + doc + ruleDescriptions

	// Check the first content item (text with results)
	t.deepEqual(result.content[0], {
		type: "text",
		text: JSON.stringify(sampleResults.results, null, 2),
	});

	// Check the second content item (extracted API references)
	// First remove the dynamic timestamp
	const apiExtractResource = result.content[1] as EmbeddedResource;
	t.notThrows(() => {
		new URL(apiExtractResource.resource.uri);
	}, "Valid URI provided");
	apiExtractResource.resource.uri = apiExtractResource.resource.uri
		.replace(/api-reference-extract-.*\.json$/, "api-reference-extract-<timestamp>.json");
	t.deepEqual(apiExtractResource, {
		type: "resource",
		resource: {
			uri: `ui5-linter-result://${pathToFileURL(path.join(projectDir, "api-reference-extract")).pathname}-<timestamp>.json`,
			text: JSON.stringify(sampleResults.contextInformation.apiReferences, null, 2),
			mimeType: "application/json",
		},
	});

	// Check the third content item (migration guides)
	t.deepEqual(result.content[2], {
		type: "resource",
		resource: {
			title: sampleResults.contextInformation.migrationGuides[0].title,
			text: sampleResults.contextInformation.migrationGuides[0].text,
			uri: sampleResults.contextInformation.migrationGuides[0].uri,
			mimeType: "text/markdown",
		},
	});

	// Check the fourth content item (documentation resources)
	t.deepEqual(result.content[3], {
		type: "resource",
		resource: {
			title: sampleResults.contextInformation.documentationResources[0].title,
			text: sampleResults.contextInformation.documentationResources[0].text,
			uri: sampleResults.contextInformation.documentationResources[0].uri,
			mimeType: "text/markdown",
		},
	});

	// Check the fifth content item (rule descriptions)
	t.deepEqual(result.content[4], {
		type: "text",
		text: JSON.stringify(sampleResults.contextInformation.ruleDescriptions, null, 2),
	});
});

test("run_ui5_linter tool handles errors correctly", async (t) => {
	const {registerToolCallback, registerTool, runUi5LinterStub} = t.context;

	// Setup runUi5Linter to throw an error
	const errorMessage = "Failed to run UI5 linter";
	runUi5LinterStub.rejects(new Error(errorMessage));

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
			fix: false,
		}, mockExtra);
	}, {message: errorMessage});
});

test("run_ui5_linter tool passes through SoftError", async (t) => {
	const {registerToolCallback, registerTool, runUi5LinterStub} = t.context;

	// Setup runUi5Linter to throw a SoftError
	const errorMessage = "Soft error occurred";
	runUi5LinterStub.rejects(new InvalidInputError(errorMessage));

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
		await executeFunction({
			projectDir: "/path/to/project",
			fix: false,
		}, mockExtra);
	}, {message: errorMessage, instanceOf: InvalidInputError});
});
