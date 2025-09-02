import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import TestContext from "../utils/TestContext.js";
import {EmbeddedResource, TextContent} from "@modelcontextprotocol/sdk/types.js";
import {pathToFileURL} from "url";
import path from "path";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	registerTools: typeof import("../../src/registerTools.js").default;
	processResponse: typeof import("../../src/registerTools.js")._processResponse;
	mockMcpServer: sinonGlobal.SinonStubbedInstance<McpServer>;
	toolStubs: {
		registerGetGuidelinesTool: sinonGlobal.SinonStub;
		registerUi5LinterTool: sinonGlobal.SinonStub;
		registerApiRefTool: sinonGlobal.SinonStub;
		registerProjectInfoTool: sinonGlobal.SinonStub;
		registerCreateUi5AppTool: sinonGlobal.SinonStub;
		registerGetVersionInfoTool: sinonGlobal.SinonStub;
	};
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Mock the tool registration functions
	const registerGetGuidelinesToolStub = t.context.sinon.stub();
	const registerUi5LinterToolStub = t.context.sinon.stub();
	const registerApiRefToolStub = t.context.sinon.stub();
	const registerProjectInfoToolStub = t.context.sinon.stub();
	const registerCreateUi5AppToolStub = t.context.sinon.stub();
	const registerGetVersionInfoToolStub = t.context.sinon.stub();

	// Store the tool stubs in the context for assertions
	t.context.toolStubs = {
		registerGetGuidelinesTool: registerGetGuidelinesToolStub,
		registerUi5LinterTool: registerUi5LinterToolStub,
		registerApiRefTool: registerApiRefToolStub,
		registerProjectInfoTool: registerProjectInfoToolStub,
		registerCreateUi5AppTool: registerCreateUi5AppToolStub,
		registerGetVersionInfoTool: registerGetVersionInfoToolStub,
	};
	const mockMcpServer = t.context.sinon.createStubInstance(McpServer);
	t.context.mockMcpServer = mockMcpServer;

	// Import the Server class with mocked dependencies
	const {default: registerTools, _processResponse} = await esmock("../../src/registerTools.js", {
		"../../src/tools/get_guidelines/index.js": {
			default: registerGetGuidelinesToolStub,
		},
		"../../src/tools/run_ui5_linter/index.js": {
			default: registerUi5LinterToolStub,
		},
		"../../src/tools/get_api_reference/index.js": {
			default: registerApiRefToolStub,
		},
		"../../src/tools/get_project_info/index.js": {
			default: registerProjectInfoToolStub,
		},
		"../../src/tools/create_ui5_app/index.js": {
			default: registerCreateUi5AppToolStub,
		},
		"../../src/tools/get_version_info/index.js": {
			default: registerGetVersionInfoToolStub,
		},
	});

	t.context.registerTools = registerTools;
	t.context.processResponse = _processResponse;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("All tools are registered in the correct order", (t) => {
	const {registerTools, toolStubs} = t.context;

	// Create a new server instance
	registerTools(t.context.mockMcpServer, new TestContext(), {
		useStructuredContentInResponse: true,
		useResourcesInResponse: true,
	});

	// Verify tools were registered in the correct order
	const sinon = t.context.sinon;

	// First tool should be guidelines (as per comment in server.ts)
	sinon.assert.callOrder(
		toolStubs.registerGetGuidelinesTool,
		toolStubs.registerUi5LinterTool,
		toolStubs.registerApiRefTool,
		toolStubs.registerProjectInfoTool,
		toolStubs.registerCreateUi5AppTool,
		toolStubs.registerGetVersionInfoTool
	);

	// Verify each tool was called exactly once
	t.true(toolStubs.registerGetGuidelinesTool.calledOnce);
	t.true(toolStubs.registerUi5LinterTool.calledOnce);
	t.true(toolStubs.registerApiRefTool.calledOnce);
	t.true(toolStubs.registerProjectInfoTool.calledOnce);
	t.true(toolStubs.registerCreateUi5AppTool.calledOnce);
	t.true(toolStubs.registerGetVersionInfoTool.calledOnce);
});

test("processResponse: Default behavior", (t) => {
	const {processResponse} = t.context;

	// Test with text content
	const textContent: TextContent[] = [
		{type: "text", text: "This is some text content."},
	];
	const responseText = processResponse({
		content: textContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseText, {
		content: textContent,
	});

	// Test with resource content
	const resourceContent: EmbeddedResource[] = [
		{
			type: "resource",
			resource: {
				uri: pathToFileURL(path.join("/", "path", "to", "resource")).toString(),
				title: "Resource Title",
				text: "This is the resource content.",
				mimeType: "text/plain",
			},
		},
	];
	const responseResource = processResponse({
		content: resourceContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseResource, {
		content: resourceContent,
	});

	// Test with structured content
	const structuredContent = {key: "value"};
	const responseStructured = processResponse({
		content: [],
		structuredContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseStructured, {
		content: [],
		structuredContent,
	});
});

test("processResponse: Do not use resources", (t) => {
	const {processResponse} = t.context;

	// Test with text content
	const textContent: TextContent[] = [
		{type: "text", text: "This is some text content."},
	];
	const responseText = processResponse({
		content: textContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: false,
	});
	t.deepEqual(responseText, {
		content: textContent,
	});

	// Test with resource content
	const resourceContent: EmbeddedResource[] = [
		{
			type: "resource",
			resource: {
				uri: pathToFileURL(path.join("/", "path", "to", "resource")).toString(),
				title: "Resource Title",
				text: "This is the resource content.",
				mimeType: "text/plain",
			},
		},
	];
	const responseResource = processResponse({
		content: resourceContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: false,
	});
	t.deepEqual(responseResource, {
		content: [{
			type: "text",
			text: "# Resource Title\n\nThis is the resource content.",
		}],
	});

	// Test with structured content
	const structuredContent = {key: "value"};
	const responseStructured = processResponse({
		content: [],
		structuredContent,
	}, {
		useStructuredContentInResponse: true,
		useResourcesInResponse: false,
	});
	t.deepEqual(responseStructured, {
		content: [],
		structuredContent,
	});
});

test("processResponse: Do not use structured content", (t) => {
	const {processResponse} = t.context;

	// Test with text content
	const textContent: TextContent[] = [
		{type: "text", text: "This is some text content."},
	];
	const responseText = processResponse({
		content: textContent,
	}, {
		useStructuredContentInResponse: false,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseText, {
		content: textContent,
	});

	// Test with resource content
	const resourceContent: EmbeddedResource[] = [
		{
			type: "resource",
			resource: {
				uri: pathToFileURL(path.join("/", "path", "to", "resource")).toString(),
				title: "Resource Title",
				text: "This is the resource content.",
				mimeType: "text/plain",
			},
		},
	];
	const responseResource = processResponse({
		content: resourceContent,
	}, {
		useStructuredContentInResponse: false,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseResource, {
		content: resourceContent,
	});

	// Test with structured content
	const structuredContent = {key: "value"};
	const responseStructured = processResponse({
		content: [],
		structuredContent,
	}, {
		useStructuredContentInResponse: false,
		useResourcesInResponse: true,
	});
	t.deepEqual(responseStructured, {
		content: [],
	});
});
