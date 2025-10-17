import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	fetchCdnStub: sinonGlobal.SinonStub;
	getLatestManifestVersion: typeof import("../../../src/utils/ui5Manifest.js").getLatestManifestVersion;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const fetchCdnStub = t.context.sinon.stub();
	t.context.fetchCdnStub = fetchCdnStub;

	// Import the module with mocked dependencies
	const {getLatestManifestVersion} = await esmock("../../../src/utils/ui5Manifest.js", {
		"../../../src/utils/cdnHelper.js": {
			fetchCdn: fetchCdnStub,
		},
	});

	t.context.getLatestManifestVersion = getLatestManifestVersion;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("getLatestManifestVersion returns correct version from CDN data", async (t) => {
	const {fetchCdnStub, getLatestManifestVersion} = t.context;
	const mockData = {
		"latest": "1.79.0",
		"1.141": "1.79.0",
		"1.140": "1.78.0",
	};
	fetchCdnStub.resolves(mockData);

	const latestVersion = await getLatestManifestVersion();

	t.is(latestVersion, "1.79.0");
	t.true(fetchCdnStub.calledOnce);
});

test("getLatestManifestVersion handles fetch errors", async (t) => {
	const {fetchCdnStub, getLatestManifestVersion} = t.context;

	// Mock fetch error
	fetchCdnStub.rejects(new Error("Network error"));

	await t.throwsAsync(
		async () => {
			await getLatestManifestVersion();
		},
		{
			message: "Network error",
		}
	);
	t.true(fetchCdnStub.calledOnce);
});

test("getLatestManifestVersion handles missing latest version", async (t) => {
	const {fetchCdnStub, getLatestManifestVersion} = t.context;
	const mockData = {
		"1.141": "1.79.0",
		"1.140": "1.78.0",
	};
	fetchCdnStub.resolves(mockData);

	await t.throwsAsync(
		async () => {
			await getLatestManifestVersion();
		},
		{
			message: "Could not determine latest manifest version.",
		}
	);
	t.true(fetchCdnStub.calledOnce);
});
