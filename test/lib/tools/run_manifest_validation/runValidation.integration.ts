import anyTest, {TestFn} from "ava";
import * as sinon from "sinon";
import esmock from "esmock";
import {readFile} from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, "..", "..", "..", "fixtures", "manifest_validation");
const schemaFixture = JSON.parse(await readFile(path.join(fixturesPath, "schema.json"), "utf-8"));
const schemaFixture_169 = JSON.parse(await readFile(path.join(fixturesPath, "schema-1.69.0.json"), "utf-8"));
const adaptiveCardSchema = JSON.parse(await readFile(path.join(fixturesPath, "adaptive-card.json"), "utf-8"));

const test = anyTest as TestFn<{
	sinon: sinon.SinonSandbox;
	runValidation: typeof import("../../../../src/tools/run_manifest_validation/runValidation.js").default;
	fetchCdnStub: sinon.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinon.createSandbox();

	t.context.fetchCdnStub = t.context.sinon.stub();

	// Import the runValidation function with cdnHelper mocked globally
	t.context.runValidation = (await esmock(
		"../../../../src/tools/run_manifest_validation/runValidation.js",
		{},
		{
			"../../../../src/utils/cdnHelper.js": {
				fetchCdn: t.context.fetchCdnStub,
			},
		}
	)).default;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("runValidation successfully validates valid manifest", async (t) => {
	const {runValidation, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.79.0": "1.79.0",
		});

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.79.0/schema.json")
		.resolves(schemaFixture);

	const result = await runValidation(path.join(fixturesPath, "valid-manifest.json"));

	t.deepEqual(result, {
		isValid: true,
		errors: [],
	});
});

test("runValidation fails to validate 1.68.0 manifest", async (t) => {
	const {runValidation, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.68.0": "1.68.0",
			"1.69.0": "1.69.0",
		});

	await t.throwsAsync(() => {
		return runValidation(path.join(fixturesPath, "manifest-168.json"));
	}, {
		message: "Manifest version '1.68.0' is not supported. " +
			"Please upgrade to a newer one." +
			"\nSupported versions are: 1.69.0.",
	});
});

test("runValidation successfully validates 1.69.0 manifest (minimum supported version)", async (t) => {
	const {runValidation, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.69.0": "1.69.0",
		});

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.69.0/schema.json")
		.resolves(schemaFixture_169);

	// Stub the fetchCdn function to return the adaptive-card.json schema when requested
	fetchCdnStub.withArgs("https://adaptivecards.io/schemas/adaptive-card.json")
		.resolves(adaptiveCardSchema);

	const result = await runValidation(path.join(fixturesPath, "manifest-169.json"));

	t.deepEqual(result, {
		isValid: false,
		errors: [{
			instancePath: "/sap.app",
			keyword: "required",
			message: "must have required property 'title'",
			params: {
				missingProperty: "title",
			},
			propertyName: undefined,
			schemaPath: "#/properties/sap.app/required",
		},
		{
			instancePath: "/sap.ui5",
			keyword: "required",
			message: "must have required property 'contentDensities'",
			params: {
				missingProperty: "contentDensities",
			},
			propertyName: undefined,
			schemaPath: "#/properties/sap.ui5/allOf/0/required",
		}],
	});
});

test("runValidation successfully validates valid manifest after first attempt ending with exception", async (t) => {
	const {runValidation, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
		.resolves({
			"1.79.0": "1.79.0",
		});

	fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.79.0/schema.json")
		.resolves(schemaFixture);

	await t.throwsAsync(async () => {
		await runValidation(path.join(fixturesPath, "missing-version-manifest.json"));
	}, {
		message: "Manifest does not contain a '_version' property." +
			"\nSupported versions are: 1.79.0.",
	});

	const result = await runValidation(path.join(fixturesPath, "valid-manifest.json"));

	t.deepEqual(result, {
		isValid: true,
		errors: [],
	});
});

test("runValidation successfully validates valid manifest after first attempt ending with schema fetch error",
	async (t) => {
		const {runValidation, fetchCdnStub} = t.context;

		fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/main/mapping.json")
			.resolves({
				"1.79.0": "1.79.0",
			});

		fetchCdnStub.withArgs("https://raw.githubusercontent.com/UI5/manifest/v1.79.0/schema.json")
			.onFirstCall()
			.rejects(new Error("Failed to fetch schema"))
			.onSecondCall()
			.resolves(schemaFixture);

		await t.throwsAsync(async () => {
			await runValidation(path.join(fixturesPath, "valid-manifest.json"));
		}, {
			message: "Failed to fetch schema for manifest version '1.79.0': Failed to fetch schema" +
				"\nSupported versions are: 1.79.0.",
		});

		const result = await runValidation(path.join(fixturesPath, "valid-manifest.json"));

		t.deepEqual(result, {
			isValid: true,
			errors: [],
		});
	}
);
