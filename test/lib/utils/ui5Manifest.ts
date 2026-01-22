import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	fetchCdnStub: sinonGlobal.SinonStub;
	getLatestManifestVersion: typeof import("../../../src/utils/ui5Manifest.js").getLatestManifestVersion;
	getManifestSchema: typeof import("../../../src/utils/ui5Manifest.js").getManifestSchema;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const fetchCdnStub = t.context.sinon.stub();
	t.context.fetchCdnStub = fetchCdnStub;

	// Import the module with mocked dependencies
	const {getLatestManifestVersion, getManifestSchema} = await esmock("../../../src/utils/ui5Manifest.js", {
		"../../../src/utils/cdnHelper.js": {
			fetchCdn: fetchCdnStub,
		},
	});

	t.context.getLatestManifestVersion = getLatestManifestVersion;
	t.context.getManifestSchema = getManifestSchema;
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

test("getLatestManifestVersion uses cache on subsequent calls", async (t) => {
	const {fetchCdnStub, getLatestManifestVersion} = t.context;
	const mockData = {
		"latest": "1.79.0",
		"1.141": "1.79.0",
		"1.140": "1.78.0",
	};
	fetchCdnStub.resolves(mockData);

	const latestVersion1 = await getLatestManifestVersion();
	const latestVersion2 = await getLatestManifestVersion();

	t.is(latestVersion1, "1.79.0");
	t.is(latestVersion2, "1.79.0");
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

test("getManifestSchema throws error for unsupported versions 1.x.x versions", async (t) => {
	const {getManifestSchema, fetchCdnStub} = t.context;

	await t.throwsAsync(
		async () => {
			await getManifestSchema("1.68.0");
		},
		{
			message: "Manifest version '1.68.0' is not supported. Please upgrade to a newer one.",
		}
	);

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.55.0": "1.55.0",
			"1.67.0": "1.67.0",
			"1.68.0": "1.68.0",
			"1.69.0": "1.69.0",
		});

	await t.throwsAsync(
		async () => {
			await getManifestSchema("1.45.0");
		},
		{
			message: "Manifest version '1.45.0' is not supported. Please upgrade to a newer one." +
				"\nSupported versions are: 1.69.0.",
		}
	);

	await t.notThrowsAsync(async () => {
		await getManifestSchema("1.69.0");
	});

	await t.notThrowsAsync(async () => {
		await getManifestSchema("2.0.0");
	});
});

test("getManifestSchema fetches schema for specific version", async (t) => {
	const {fetchCdnStub, getManifestSchema} = t.context;
	const mockSchema = {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
	};

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.69.0/schema.json")
		.resolves(mockSchema);

	const schema = await getManifestSchema("1.69.0");

	t.deepEqual(schema, mockSchema);
	t.true(fetchCdnStub.calledOnce);
});

test("getManifestSchema uses cache on subsequent calls", async (t) => {
	const {fetchCdnStub, getManifestSchema} = t.context;
	const mockSchema = {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
	};

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.69.0/schema.json")
		.resolves(mockSchema);

	const schema1 = await getManifestSchema("1.69.0");
	const schema2 = await getManifestSchema("1.69.0");

	t.deepEqual(schema1, mockSchema);
	t.deepEqual(schema2, mockSchema);
	t.true(fetchCdnStub.calledOnce);
});

test("getManifestSchema handles fetch errors", async (t) => {
	const {fetchCdnStub, getManifestSchema} = t.context;

	// Mock fetch error
	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.rejects(new Error("Mapping.json error"));

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.69.0/schema.json")
		.rejects(new Error("Network error"));

	await t.throwsAsync(
		async () => {
			await getManifestSchema("1.69.0");
		},
		{
			message: "Failed to fetch schema for manifest version '1.69.0': Network error",
		}
	);
	t.true(fetchCdnStub.calledTwice);
});

test("getManifestSchema handles fetch errors and gives more details about supported versions", async (t) => {
	const {fetchCdnStub, getManifestSchema} = t.context;

	// Mock fetch error
	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.70.0": "1.70.0",
			"1.71.0": "1.71.0",
		});

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.69.0/schema.json")
		.rejects(new Error("Network error"));

	await t.throwsAsync(
		async () => {
			await getManifestSchema("1.69.0");
		},
		{
			message: "Failed to fetch schema for manifest version '1.69.0': Network error" +
				"\nSupported versions are: 1.70.0, 1.71.0.",
		}
	);
	t.true(fetchCdnStub.calledTwice);
});
