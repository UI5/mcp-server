import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {getLatestUi5Version} from "../../../../src/tools/create_ui5_app/ui5Version.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getLatestUi5Version: typeof getLatestUi5Version;
	getVersionInfoStub: sinonGlobal.SinonStub;
}>;

const fakeVersionInfo = {
	versions: {
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
	},
};

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Create a stub for getVersionInfo
	const getVersionInfoStub = t.context.sinon.stub().resolves(fakeVersionInfo);

	// Import the module with mocked dependencies
	const {getLatestUi5Version} = await esmock(
		"../../../../src/tools/create_ui5_app/ui5Version.js", {
			"../../../../src/tools/get_version_info/getVersionInfo.js": {
				default: getVersionInfoStub,
			},
		}
	);

	t.context.getLatestUi5Version = getLatestUi5Version;
	t.context.getVersionInfoStub = getVersionInfoStub;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("getLatestUi5Version returns the latest version for OpenUI5", async (t) => {
	const version = await t.context.getLatestUi5Version("OpenUI5");

	// Verify the result
	t.is(version, "1.138.1", "Returns the correct latest version");

	// Verify getVersionInfo was called with the correct parameters
	t.is(t.context.getVersionInfoStub.callCount, 1, "getVersionInfo was called once");
	t.deepEqual(
		t.context.getVersionInfoStub.firstCall.args[0],
		{frameworkName: "OpenUI5"},
		"getVersionInfo was called with the correct framework name"
	);
});

test("getLatestUi5Version returns the latest version for SAPUI5", async (t) => {
	const version = await t.context.getLatestUi5Version("SAPUI5");

	// Verify the result
	t.is(version, "1.138.1", "Returns the correct latest version");

	// Verify getVersionInfo was called with the correct parameters
	t.is(t.context.getVersionInfoStub.callCount, 1, "getVersionInfo was called once");
	t.deepEqual(
		t.context.getVersionInfoStub.firstCall.args[0],
		{frameworkName: "SAPUI5"},
		"getVersionInfo was called with the correct framework name"
	);
});
