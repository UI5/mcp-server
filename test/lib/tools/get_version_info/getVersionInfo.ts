import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import type getVersionInfo from "../../../../src/tools/get_version_info/getVersionInfo.js";
import esmock from "esmock";

const fakeVersionInfo = {
	latest: {
		version: "1.138.1",
		support: "Maintenance",
		lts: false,
	},
	active: {
		version: "1.138.1",
		support: "Maintenance",
		lts: false,
	},
	1.138: {
		version: "1.138.1",
		support: "Maintenance",
		lts: false,
	},
	1.136: {
		version: "1.136.4",
		support: "Maintenance",
		lts: true,
	},
};

async function getMockedModule() {
	const fetchCdn = sinonGlobal.stub().resolves(fakeVersionInfo);
	const loggerMock = {
		silly: sinonGlobal.stub(),
		verbose: sinonGlobal.stub(),
		perf: sinonGlobal.stub(),
		info: sinonGlobal.stub(),
		warn: sinonGlobal.stub(),
		error: sinonGlobal.stub(),
		isLevelEnabled: sinonGlobal.stub().returns(true),
	};

	const {default: getVersionInfo} = await esmock(
		"../../../../src/tools/get_version_info/getVersionInfo.js", {
			"../../../../src/utils/cdnHelper.js": {
				fetchCdn,
			},
			"@ui5/logger": {
				getLogger: sinonGlobal.stub().returns(loggerMock),
				isLogLevelEnabled: sinonGlobal.stub().returns(true),
			},
		}
	);
	return {getVersionInfo, fetchCdn, loggerMock};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getVersionInfo: typeof getVersionInfo;
	fetchCdn: sinonGlobal.SinonStub;
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
	const {getVersionInfo, fetchCdn, loggerMock} = await getMockedModule();
	t.context.getVersionInfo = getVersionInfo;
	t.context.fetchCdn = fetchCdn;
	t.context.loggerMock = loggerMock;
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("Get version info for SAPUI5", async (t) => {
	const res = await t.context.getVersionInfo({frameworkName: "SAPUI5"});

	t.deepEqual(res.versions, fakeVersionInfo, "Fetched version info matches expected data");

	t.is(t.context.fetchCdn.callCount, 1, "fetchCdn was called once");
	t.deepEqual(t.context.fetchCdn.firstCall.args, ["https://ui5.sap.com/version.json"]);

	// Verify log message
	t.true(t.context.loggerMock.info.calledOnce, "Logger.info was called once");
	t.true(
		t.context.loggerMock.info.firstCall.args[0].includes("Fetching version information for SAPUI5"),
		"Log message includes framework name"
	);
});

test("Get version info for OpenUI5", async (t) => {
	const res = await t.context.getVersionInfo({frameworkName: "OpenUI5"});

	t.deepEqual(res.versions, fakeVersionInfo, "Fetched version info matches expected data");

	t.is(t.context.fetchCdn.callCount, 1, "fetchCdn was called once");
	t.deepEqual(t.context.fetchCdn.firstCall.args, ["https://sdk.openui5.org/version.json"]);

	// Verify log message
	t.true(t.context.loggerMock.info.calledOnce, "Logger.info was called once");
	t.true(
		t.context.loggerMock.info.firstCall.args[0].includes("Fetching version information for OpenUI5"),
		"Log message includes framework name"
	);
});
