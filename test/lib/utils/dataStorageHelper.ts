import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import path from "node:path";
import os from "node:os";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	dataStorageHelperModule: typeof import("../../../src/utils/dataStorageHelper.js");
	getDataDir: typeof import("../../../src/utils/dataStorageHelper.js").getDataDir;
	synchronize: typeof import("../../../src/utils/dataStorageHelper.js").synchronize;
	mkdirStub: sinonGlobal.SinonStub;
	lockStub: sinonGlobal.SinonStub;
	unlockStub: sinonGlobal.SinonStub;
	originalEnv: NodeJS.ProcessEnv;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Save original environment
	t.context.originalEnv = {...process.env};

	// Create stubs for fs functions
	const mkdirStub = t.context.sinon.stub();
	t.context.mkdirStub = mkdirStub;

	// Create stubs for lockfile functions
	const lockStub = t.context.sinon.stub().callsArgAsync(2);
	const unlockStub = t.context.sinon.stub().callsArgAsync(1);
	t.context.lockStub = lockStub;
	t.context.unlockStub = unlockStub;

	// Create logger mock
	const loggerMock = {
		silly: t.context.sinon.stub(),
		verbose: t.context.sinon.stub(),
		perf: t.context.sinon.stub(),
		info: t.context.sinon.stub(),
		warn: t.context.sinon.stub(),
		error: t.context.sinon.stub(),
		isLevelEnabled: t.context.sinon.stub().returns(true),
	};
	t.context.loggerMock = loggerMock;

	// Import the module with mocked dependencies
	t.context.dataStorageHelperModule = await esmock.p("../../../src/utils/dataStorageHelper.js", {
		"node:fs/promises": {
			mkdir: mkdirStub,
		},
		"lockfile": {
			default: {
				lock: lockStub,
				unlock: unlockStub,
			},
		},
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
			isLogLevelEnabled: t.context.sinon.stub().returns(true),
		},
	});

	t.context.getDataDir = t.context.dataStorageHelperModule.getDataDir;
	t.context.synchronize = t.context.dataStorageHelperModule.synchronize;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
	esmock.purge(t.context.dataStorageHelperModule);

	// Restore original environment
	process.env = t.context.originalEnv;
});

test.serial("getDataDir returns path with default base directory", (t) => {
	const {getDataDir, loggerMock} = t.context;

	const identifier = "test-identifier";
	const expectedPath = path.join(os.homedir(), ".ui5", "mcp-server", identifier);

	const result = getDataDir(identifier);
	t.is(result, expectedPath);

	// Verify log message
	t.true(loggerMock.verbose.called, "Logger.verbose should be called");
	t.true(
		loggerMock.verbose.calledWith(t.context.sinon.match(/Using base directory for data storage/)),
		"Log message should indicate base directory"
	);
});

test.serial("getDataDir returns path with custom base directory from environment", (t) => {
	const {getDataDir} = t.context;

	const customDir = path.join(process.cwd(), "test", "tmp", "custom", "data", "dir");
	process.env.UI5_DATA_DIR = customDir;

	const identifier = "test-identifier";
	const expectedPath = path.join(customDir, "mcp-server", identifier);

	const result = getDataDir(identifier);
	t.is(result, expectedPath);
});

test.serial("getDataDir throws error for invalid identifier", (t) => {
	const {getDataDir} = t.context;

	const invalidIdentifier = "invalid/identifier";

	const error = t.throws(() => getDataDir(invalidIdentifier));
	t.is(
		error?.message,
		`Invalid identifier: ${invalidIdentifier}. Only alphanumeric characters, dashes, and underscores are allowed.`
	);
});

test.serial("synchronize acquires and releases lock", async (t) => {
	const {synchronize, mkdirStub, lockStub, unlockStub, loggerMock} = t.context;

	const lockName = "test-lock";
	const expectedLockDir = path.join(os.homedir(), ".ui5", "mcp-server", "locks");
	const expectedLockPath = path.join(expectedLockDir, `${lockName}.lock`);

	const callbackStub = t.context.sinon.stub().resolves("result");

	const result = await synchronize(lockName, callbackStub);

	// Verify mkdir was called to create lock directory
	t.true(mkdirStub.calledOnce);
	t.deepEqual(mkdirStub.firstCall.args, [expectedLockDir, {recursive: true}]);

	// Verify lock was acquired
	t.true(lockStub.calledOnce);
	t.is(lockStub.firstCall.args[0], expectedLockPath);

	// Verify log messages
	t.true(loggerMock.verbose.calledWith(t.context.sinon.match(/Using lock directory/)),
		"Log message should indicate lock directory");
	t.true(loggerMock.verbose.calledWith(t.context.sinon.match(/Locking/)),
		"Log message should indicate locking");
	t.true(loggerMock.verbose.calledWith(t.context.sinon.match(/Unlocking/)),
		"Log message should indicate unlocking");

	// Verify callback was called
	t.true(callbackStub.calledOnce);

	// Verify lock was released
	t.true(unlockStub.calledOnce);
	t.is(unlockStub.firstCall.args[0], expectedLockPath);

	// Verify result was returned
	t.is(result, "result");
});

test.serial("synchronize releases lock even if callback throws", async (t) => {
	const {synchronize, lockStub, unlockStub} = t.context;

	const lockName = "test-lock";
	const error = new Error("Test error");
	const callbackStub = t.context.sinon.stub().rejects(error);

	await t.throwsAsync(async () => {
		await synchronize(lockName, callbackStub);
	}, {is: error});

	// Verify lock was acquired
	t.true(lockStub.calledOnce);

	// Verify callback was called
	t.true(callbackStub.calledOnce);

	// Verify lock was released even though callback threw
	t.true(unlockStub.calledOnce);
});

test.serial("synchronize sanitizes lock name", async (t) => {
	const {synchronize, lockStub} = t.context;

	// This lock name contains a forward slash which should be replaced with a dash
	const lockName = "test/lock";
	const expectedLockPath = path.join(os.homedir(), ".ui5", "mcp-server", "locks", "test-lock.lock");

	const callbackStub = t.context.sinon.stub().resolves();

	await synchronize(lockName, callbackStub);

	// Verify lock was acquired with sanitized name
	t.true(lockStub.calledOnce);
	t.is(lockStub.firstCall.args[0], expectedLockPath);
});

test.serial("synchronize throws for invalid lock name", async (t) => {
	const {synchronize} = t.context;

	// Lock name starting with a dot is invalid
	const lockName = ".invalid";
	const callbackStub = t.context.sinon.stub().resolves();

	await t.throwsAsync(async () => {
		await synchronize(lockName, callbackStub);
	}, {message: `Illegal file name: ${lockName}`});

	// Verify callback was not called
	t.false(callbackStub.called);
});

test.serial("synchronize throws for lock name with illegal characters", async (t) => {
	const {synchronize} = t.context;

	// Lock name with illegal characters
	const lockName = "invalid*name";
	const callbackStub = t.context.sinon.stub().resolves();

	await t.throwsAsync(async () => {
		await synchronize(lockName, callbackStub);
	}, {message: `Illegal file name: ${lockName}`});

	// Verify callback was not called
	t.false(callbackStub.called);
});
