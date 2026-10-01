import anyTest, {TestFn} from "ava";
import * as sinon from "sinon";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinon.SinonSandbox;
	fetchCdnStub: sinon.SinonStub;
	createValidateFunction: typeof import(
		"../../../../src/tools/run_manifest_validation/createValidationFunction.js"
	).createValidateFunction;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinon.createSandbox();
	t.context.fetchCdnStub = t.context.sinon.stub();

	t.context.createValidateFunction = (await esmock(
		"../../../../src/tools/run_manifest_validation/createValidationFunction.js",
		{},
		{
			"../../../../src/utils/cdnHelper.js": {
				fetchCdn: t.context.fetchCdnStub,
			},
		}
	)).createValidateFunction;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

const EXTERNAL_SCHEMA_HTTPS_DRAFT06 = {
	$schema: "https://json-schema.org/draft-06/schema#",
	$id: "https://example.com/ext-schema.json",
	type: "object",
};

const EXTERNAL_SCHEMA_HTTP_DRAFT06 = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "https://example.com/ext-schema.json",
	type: "object",
};

const EXTERNAL_SCHEMA_HTTPS_DRAFT07 = {
	$schema: "https://json-schema.org/draft-07/schema#",
	$id: "https://example.com/ext-schema.json",
	type: "object",
};

const EXTERNAL_SCHEMA_HTTP_DRAFT07 = {
	$schema: "http://json-schema.org/draft-07/schema#",
	$id: "https://example.com/ext-schema.json",
	type: "object",
};

const DRAFT07_SCHEMA_WITH_EXTERNAL_REF = {
	$schema: "http://json-schema.org/draft-07/schema#",
	type: "object",
	properties: {
		item: {$ref: "https://example.com/ext-schema.json"},
	},
};

const DRAFT2020_SCHEMA_WITH_EXTERNAL_REF = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	type: "object",
	properties: {
		item: {$ref: "https://example.com/ext-schema.json"},
	},
};

test("createValidateFunction (draft-07): succeeds when external schema uses https:// draft-06 $schema", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTPS_DRAFT06);

	const validate = await createValidateFunction(DRAFT07_SCHEMA_WITH_EXTERNAL_REF);
	t.true(typeof validate === "function");
});

test("createValidateFunction (draft-07): succeeds when external schema uses http:// draft-06 $schema", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTP_DRAFT06);

	const validate = await createValidateFunction(DRAFT07_SCHEMA_WITH_EXTERNAL_REF);
	t.true(typeof validate === "function");
});

test("createValidateFunction (draft-07): draft-06 meta-schema URI is not fetched via network", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTPS_DRAFT06);

	await createValidateFunction(DRAFT07_SCHEMA_WITH_EXTERNAL_REF);

	t.false(
		fetchCdnStub.calledWith("https://json-schema.org/draft-06/schema"),
		"fetchCdn must not be called for draft-06 meta-schema URI"
	);
	t.false(
		fetchCdnStub.calledWith("http://json-schema.org/draft-06/schema"),
		"fetchCdn must not be called for draft-06 meta-schema URI"
	);
});

test("createValidateFunction (2020-12): succeeds when external schema uses https:// draft-07 $schema", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTPS_DRAFT07);

	const validate = await createValidateFunction(DRAFT2020_SCHEMA_WITH_EXTERNAL_REF);
	t.true(typeof validate === "function");
});

test("createValidateFunction (2020-12): succeeds when external schema uses http:// draft-07 $schema", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTP_DRAFT07);

	const validate = await createValidateFunction(DRAFT2020_SCHEMA_WITH_EXTERNAL_REF);
	t.true(typeof validate === "function");
});

test("createValidateFunction (2020-12): draft-07 meta-schema URI is not fetched via network", async (t) => {
	const {createValidateFunction, fetchCdnStub} = t.context;

	fetchCdnStub.withArgs("https://example.com/ext-schema.json")
		.resolves(EXTERNAL_SCHEMA_HTTPS_DRAFT07);

	await createValidateFunction(DRAFT2020_SCHEMA_WITH_EXTERNAL_REF);

	t.false(
		fetchCdnStub.calledWith("https://json-schema.org/draft-07/schema"),
		"fetchCdn must not be called for draft-07 meta-schema URI"
	);
	t.false(
		fetchCdnStub.calledWith("http://json-schema.org/draft-07/schema"),
		"fetchCdn must not be called for draft-07 meta-schema URI"
	);
});

test("createValidateFunction throws for unsupported meta-schema", async (t) => {
	const {createValidateFunction} = t.context;

	await t.throwsAsync(
		() => createValidateFunction({$schema: "http://json-schema.org/draft-04/schema#"}),
		{message: /not a supported meta-schema/}
	);
});
