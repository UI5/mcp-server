import anyTest, {TestFn} from "ava";
import sinonGlobal, {SinonStub} from "sinon";
import esmock from "esmock";
import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {PKG_VERSION} from "../../src/utils.js";

const test = anyTest as TestFn<{
	simulateServerInitialized: () => Promise<void>;
	sinon: sinonGlobal.SinonSandbox;
	Server: typeof import("../../src/server.js").default;
	mockMcpServer: sinonGlobal.SinonStubbedInstance<McpServer>;
	mockTransport: sinonGlobal.SinonStubbedInstance<Transport>;
	constructorStub: sinonGlobal.SinonStub;
	contextConstructorStub: sinonGlobal.SinonStub;
	contextSetRootsStub: sinonGlobal.SinonStub;
	originalEnv: NodeJS.ProcessEnv;
	registerToolsStub: sinonGlobal.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Save original environment
	t.context.originalEnv = {...process.env};

	// Create mock for McpServer
	const mockMcpServer = t.context.sinon.createStubInstance(McpServer);
	// @ts-expect-error stub read-only property "server"
	mockMcpServer.server = {
		listRoots: t.context.sinon.stub()
			.onFirstCall()
			.resolves({
				roots: [{
					name: "my-root",
					uri: "file://test-root",
				}],
			})
			.onSecondCall()
			.resolves({
				roots: [{
					name: "my-root",
					uri: "file://changed-test-root",
				}, {
					name: "my-other-root",
					uri: "file://other-test-root",
				}],
			}),
		setNotificationHandler: t.context.sinon.stub(),
		getClientCapabilities: () => ({
			roots: {
				listChanged: true,
			},
		}),
	};
	t.context.simulateServerInitialized = async () => {
		// @ts-expect-error - Types are not compatible with the mock
		// eslint-disable-next-line @typescript-eslint/await-thenable
		await mockMcpServer.server.oninitialized();
	};
	t.context.mockMcpServer = mockMcpServer;

	// Create mock for Transport
	const mockTransport = t.context.sinon.createStubInstance(StdioServerTransport) as unknown as
		sinonGlobal.SinonStubbedInstance<Transport>;
	t.context.mockTransport = mockTransport;

	// Create a constructor stub that will be used both for mocking and assertions
	const mcpServerConstructorStub = t.context.sinon.stub().returns(mockMcpServer);
	t.context.constructorStub = mcpServerConstructorStub;

	t.context.registerToolsStub = t.context.sinon.stub();

	t.context.contextSetRootsStub = t.context.sinon.stub();
	t.context.contextConstructorStub = t.context.sinon.stub().returns({
		setRoots: t.context.contextSetRootsStub,
	});
	// Import the Server class with mocked dependencies
	const {default: Server} = await esmock("../../src/server.js", {
		"@modelcontextprotocol/sdk/server/mcp.js": {
			McpServer: mcpServerConstructorStub,
		},
		"../../src/Context.js": {
			default: t.context.contextConstructorStub,
		},
		"../../src/registerTools.js": {
			default: t.context.registerToolsStub,
		},
	});

	t.context.Server = Server;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
	// Restore original environment
	process.env = t.context.originalEnv;
});

test("Server constructor initializes with correct configuration", (t) => {
	const {Server, constructorStub, registerToolsStub} = t.context;

	// Create a new server instance
	new Server();

	// Verify McpServer was initialized with correct parameters
	t.is(constructorStub.callCount, 1);
	const constructorArgs = constructorStub.firstCall.args[0];
	t.is(constructorArgs.name, "UI5");
	t.is(constructorArgs.version, PKG_VERSION);
	t.deepEqual(constructorArgs.capabilities, {tools: {}});

	t.deepEqual(registerToolsStub.firstCall.args[2], {
		useStructuredContentInResponse: true,
		useResourcesInResponse: true,
	});
});

test.serial("Context is created with correct parameters", (t) => {
	const {Server, registerToolsStub} = t.context;

	process.env.UI5_MCP_SERVER_RESPONSE_NO_STRUCTURED_CONTENT = "true";
	process.env.UI5_MCP_SERVER_RESPONSE_NO_RESOURCES = "any-value";

	// Create a new server instance
	new Server();

	t.deepEqual(registerToolsStub.firstCall.args[2], {
		useStructuredContentInResponse: false,
		useResourcesInResponse: false,
	});
});

test("connect method connects the server with default transport", async (t) => {
	const {Server, mockMcpServer, simulateServerInitialized, contextSetRootsStub} = t.context;
	// Create a new server instance
	const server = new Server();

	// Mock isConnected to return false initially
	mockMcpServer.isConnected.returns(true).onFirstCall().returns(false);

	// Connect the server
	await server.connect();

	// Verify connect was called with StdioServerTransport
	t.true(mockMcpServer.connect.calledOnce);
	t.true(mockMcpServer.connect.firstCall.args[0] instanceof StdioServerTransport);

	// eslint-disable-next-line @typescript-eslint/unbound-method
	const listRoots = mockMcpServer.server.listRoots as SinonStub;
	t.true(listRoots.notCalled);

	await simulateServerInitialized();

	t.true(listRoots.calledOnce);
	t.true(contextSetRootsStub.calledOnce);
	t.deepEqual(contextSetRootsStub.firstCall.args[0], [{
		name: "my-root",
		uri: "file://test-root",
	}]);
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const setNotificationHandler = mockMcpServer.server.setNotificationHandler as SinonStub;
	t.true(setNotificationHandler.calledOnce);
	// Trigger notification handler
	await setNotificationHandler.firstCall.args[1]({method: "notifications/roots/list_changed"});
	t.true(listRoots.calledTwice);

	t.true(contextSetRootsStub.calledTwice);
	t.deepEqual(contextSetRootsStub.secondCall.args[0], [{
		name: "my-root",
		uri: "file://changed-test-root",
	}, {
		name: "my-other-root",
		uri: "file://other-test-root",
	}]);
});

test("connect method connects the server with custom transport", async (t) => {
	const {Server, mockMcpServer, mockTransport} = t.context;

	// Create a new server instance
	const server = new Server();

	// Mock isConnected to return false initially
	mockMcpServer.isConnected.returns(true).onFirstCall().returns(false);

	// Connect the server with custom transport
	await server.connect(mockTransport);

	// Verify connect was called with the custom transport
	t.true(mockMcpServer.connect.calledOnce);
	t.is(mockMcpServer.connect.firstCall.args[0], mockTransport);
});

test("connect method throws error if server is already connected", async (t) => {
	const {Server, mockMcpServer} = t.context;

	// Create a new server instance
	const server = new Server();

	// Mock isConnected to return true
	mockMcpServer.isConnected.returns(true);

	// Attempt to connect the server
	await t.throwsAsync(async () => {
		await server.connect();
	}, {message: "Server is already connected"});

	// Verify connect was not called
	t.false(mockMcpServer.connect.called);
});

test("close method closes the server", async (t) => {
	const {Server, mockMcpServer} = t.context;

	// Create a new server instance
	const server = new Server();

	// Mock isConnected to return true
	mockMcpServer.isConnected.returns(true);

	// Close the server
	await server.close();

	// Verify close was called
	t.true(mockMcpServer.close.calledOnce);
});

test("close method throws error if server is not connected", async (t) => {
	const {Server, mockMcpServer} = t.context;

	// Create a new server instance
	const server = new Server();

	// Mock isConnected to return false
	mockMcpServer.isConnected.returns(false);

	// Attempt to close the server
	await t.throwsAsync(async () => {
		await server.close();
	}, {message: "Server is not connected"});

	// Verify close was not called
	t.false(mockMcpServer.close.called);
});
