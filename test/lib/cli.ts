import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	ServerConstructor: sinonGlobal.SinonStub;
	serverInstance: {
		connect: sinonGlobal.SinonStub;
	};
	exitStub: sinonGlobal.SinonStub;
	originalArgv: string[];
}>;

test.beforeEach((t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Store and mock process.argv
	t.context.originalArgv = process.argv;

	// Create a mock Server instance with a connect method
	const serverInstance = {
		connect: t.context.sinon.stub().resolves(),
	};

	// Create a mock Server constructor that returns our mock instance
	const ServerConstructor = t.context.sinon.stub().returns(serverInstance);

	// Mock process.exit to prevent tests from actually exiting
	const exitStub = t.context.sinon.stub(process, "exit");

	// Store references for assertions
	t.context.ServerConstructor = ServerConstructor;
	t.context.serverInstance = serverInstance;
	t.context.exitStub = exitStub;
});

test.afterEach.always((t) => {
	// Restore original process.argv
	process.argv = t.context.originalArgv;

	t.context.sinon.restore();
});

test.serial("CLI creates a Server instance and connects to it", async (t) => {
	const {ServerConstructor, serverInstance} = t.context;

	// Mock the Server import in cli
	await esmock("../../src/cli.js", {
		"../../src/server.js": {
			default: ServerConstructor,
		},
	});

	// Verify Server constructor was called once
	t.true(ServerConstructor.calledOnce);
	t.true(ServerConstructor.calledWithNew());
	t.deepEqual(ServerConstructor.firstCall.args, []);

	// Verify connect was called once with no arguments
	t.true(serverInstance.connect.calledOnce);
	t.deepEqual(serverInstance.connect.firstCall.args, []);
});

test.serial("CLI handles server connection errors", async (t) => {
	const {sinon} = t.context;

	// Create a mock server instance that throws an error on connect
	const serverInstance = {
		connect: sinon.stub().rejects(new Error("Connection failed")),
	};

	// Create a mock Server constructor that returns our mock instance
	const ServerConstructor = sinon.stub().returns(serverInstance);

	// Mock the Server import in cli
	await t.throwsAsync(
		esmock("../../src/cli.js", {
			"../../src/server.js": {
				default: ServerConstructor,
			},
		}),
		{message: "Connection failed"}
	);

	// Verify Server constructor was called
	t.true(ServerConstructor.calledOnce);
	t.true(ServerConstructor.calledWithNew());

	// Verify connect was called and failed
	t.true(serverInstance.connect.calledOnce);
});

test.serial("CLI exits with error when arguments are provided", async (t) => {
	const {sinon, exitStub} = t.context;

	// Mock stderr.write to capture error messages
	const stderrWriteStub = sinon.stub(process.stderr, "write");

	// Add argument to process.argv
	process.argv.push("some-argument");

	// Mock the Server import in cli - it shouldn't be called
	await esmock("../../src/cli.js", {
		"../../src/server.js": {
			default: t.context.ServerConstructor,
		},
	});

	// Verify process.exit was called with code 2
	t.true(exitStub.calledOnce);
	t.true(exitStub.calledWith(2));

	// Verify error messages were written to stderr
	t.true(stderrWriteStub.calledThrice);
	t.true(stderrWriteStub.firstCall.calledWith("\n"));
	t.true(stderrWriteStub.secondCall.calledWith(
		"Unexpected arguments: This command does not accept any arguments.\n"
	));
	t.true(stderrWriteStub.thirdCall.calledWith("Usage: ui5mcp\n"));

	// Verify Server constructor was not called
	t.false(t.context.ServerConstructor.called);
});
