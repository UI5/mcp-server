import anyTest, {TestFn} from "ava";
import * as sinon from "sinon";
import esmock from "esmock";
import {readFile} from "fs/promises";
import {InvalidInputError} from "../../../../src/utils.js";

const test = anyTest as TestFn<{
	sinon: sinon.SinonSandbox;
	readFileStub: sinon.SinonStub;
	manifestFileContent: string;
	getManifestSchemaStub: sinon.SinonStub;
	fetchCdnStub: sinon.SinonStub;
	runValidation: typeof import("../../../../src/tools/run_manifest_validation/runValidation.js").default;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinon.createSandbox();
	t.context.manifestFileContent = "";

	// Create a stub that only intercepts specific manifest paths, otherwise calls real readFile
	t.context.readFileStub = t.context.sinon.stub().callsFake(async (
		path: string,
		encoding?: BufferEncoding | null
	) => {
		// Only handle specific manifest paths that we explicitly stub
		if (path === "/path/to/manifest.json") {
			// These will be handled by withArgs() stubs below
			return t.context.manifestFileContent;
		}
		// For all other files (including AJV schema files), call the real readFile
		return readFile(path, encoding ?? "utf-8");
	});

	t.context.getManifestSchemaStub = t.context.sinon.stub();
	t.context.fetchCdnStub = t.context.sinon.stub();

	// Import the runValidation function
	t.context.runValidation = (await esmock(
		"../../../../src/tools/run_manifest_validation/runValidation.js",
		{
			"fs/promises": {
				readFile: t.context.readFileStub,
			},
			"../../../../src/utils/ui5Manifest.js": {
				getManifestSchema: t.context.getManifestSchemaStub,
			},
		},
		{
			"../../../../src/utils/cdnHelper.js": {
				fetchCdn: t.context.fetchCdnStub,
			},
			"../../../../src/utils.js": {
				InvalidInputError,
			},
		}
	)).default;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("runValidation successfully validates valid manifest", async (t) => {
	const {runValidation, getManifestSchemaStub} = t.context;

	// Stub the readFile function to return a valid manifest
	const validManifest = {
		"_version": "1.0.0",
		"sap.app": {
			id: "my.app.id",
			type: "application",
		},
	};
	t.context.manifestFileContent = JSON.stringify(validManifest);

	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			"_version": {type: "string"},
			"sap.app": {
				type: "object",
				properties: {
					id: {type: "string"},
					type: {type: "string"},
				},
				required: ["id", "type"],
			},
		},
		required: ["sap.app"],
		additionalProperties: false,
	});

	const result = await runValidation("/path/to/manifest.json");

	t.deepEqual(result, {
		isValid: true,
		errors: [],
	});
});

test("runValidation successfully validates invalid manifest", async (t) => {
	const {runValidation, getManifestSchemaStub} = t.context;

	// Stub the readFile function to return an invalid manifest
	const invalidManifest = {
		"_version": "1.0.0",
		"sap.app": {
			Bad: "value",
		},
	};
	t.context.manifestFileContent = JSON.stringify(invalidManifest);

	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			"sap.app": {
				type: "object",
				propertyNames: {
					pattern: "^[a-z]+$", // Enforce lowercase property names
				},
			},
		},
	});

	const result = await runValidation("/path/to/manifest.json");

	t.deepEqual(result, {
		isValid: false,
		errors: [
			{
				params: {pattern: "^[a-z]+$"},
				keyword: "pattern",
				instancePath: "/sap.app",
				schemaPath: "#/properties/sap.app/propertyNames/pattern",
				message: "must match pattern \"^[a-z]+$\"",
				propertyName: "Bad",
			},
			{
				params: {propertyName: "Bad"},
				keyword: "propertyNames",
				instancePath: "/sap.app",
				schemaPath: "#/properties/sap.app/propertyNames",
				message: "property name must be valid",
				propertyName: undefined,
			},
		],
	});
});

test("runValidation throws error when manifest file path is not absolute", async (t) => {
	const {runValidation} = t.context;

	await t.throwsAsync(async () => {
		return await runValidation("relativeManifest.json");
	}, {
		instanceOf: InvalidInputError,
		message: "The manifest path must be absolute: 'relativeManifest.json'",
	});
});

test("runValidation throws error when manifest file path is not correct", async (t) => {
	const {runValidation, readFileStub} = t.context;

	// Stub the readFile function to throw an error
	readFileStub.rejects(new Error("File not found"));

	await t.throwsAsync(async () => {
		return await runValidation("/nonexistent/path");
	}, {
		instanceOf: InvalidInputError,
		message: /Failed to read manifest file at .+: .+/,
	});
});

test("runValidation throws error when manifest file content is invalid JSON", async (t) => {
	const {runValidation} = t.context;

	t.context.manifestFileContent = "Invalid JSON Content";

	await t.throwsAsync(async () => {
		return await runValidation("/path/to/manifest.json");
	}, {
		instanceOf: InvalidInputError,
		message: /Failed to parse manifest file at .+ as JSON: .+/,
	});
});

test("runValidation throws error when schema validation function cannot be compiled", async (t) => {
	const {runValidation, getManifestSchemaStub} = t.context;

	t.context.manifestFileContent = JSON.stringify({
		_version: "1.0.0",
	});
	getManifestSchemaStub.resolves(null); // Simulate invalid schema

	await t.throwsAsync(async () => {
		return await runValidation("/path/to/manifest.json");
	}, {
		instanceOf: Error,
		message: /Failed to create UI5 manifest validate function: .+/,
	});
});

test("runValidation successfully validates valid manifest against external schema", async (t) => {
	const {runValidation, getManifestSchemaStub, fetchCdnStub} = t.context;

	t.context.manifestFileContent = JSON.stringify({
		"_version": "1.0.0",
		"sap.app": {
			id: "my.app.id",
			type: "application",
		},
	});

	// Schema that references an external schema
	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			"_version": {type: "string"},
			"sap.app": {
				$ref: "externalSchema.json",
			},
		},
		required: ["sap.app"],
		additionalProperties: false,
	});

	// Stub the readFile function to return the external schema when requested
	const externalSchema = {
		type: "object",
		properties: {
			id: {type: "string"},
			type: {type: "string"},
		},
		required: ["id", "type"],
	};
	fetchCdnStub.withArgs("externalSchema.json")
		.resolves(externalSchema);

	const result = await runValidation("/path/to/manifest.json");

	t.deepEqual(result, {
		isValid: true,
		errors: [],
	});
});

test("runValidation throws error when external schema cannot be fetched", async (t) => {
	const {runValidation, getManifestSchemaStub, fetchCdnStub} = t.context;

	t.context.manifestFileContent = JSON.stringify({
		"_version": "1.0.0",
		"sap.app": {
			id: "my.app.id",
			type: "application",
		},
	});

	// Schema that references an external schema
	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			"_version": {type: "string"},
			"sap.app": {
				$ref: "externalSchema.json",
			},
		},
		required: ["sap.app"],
		additionalProperties: false,
	});

	// Stub the fetchCdn function to throw an error when fetching the external schema
	fetchCdnStub.withArgs("externalSchema.json")
		.rejects(new Error("Failed to fetch external schema"));

	await t.throwsAsync(async () => {
		return await runValidation("/path/to/manifest.json");
	}, {
		instanceOf: Error,
		message: /Failed to create UI5 manifest validate function: .+/,
	});
});

test("runValidation uses cache on subsequent calls for external schemas", async (t) => {
	const {runValidation, getManifestSchemaStub, fetchCdnStub} = t.context;

	t.context.manifestFileContent = JSON.stringify({
		"_version": "1.0.0",
		"sap.app": {
			id: "my.app.id",
			type: "application",
		},
	});

	// Schema that references an external schema
	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			"_version": {type: "string"},
			"sap.app": {
				$ref: "externalSchema.json",
			},
		},
		required: ["sap.app"],
		additionalProperties: false,
	});

	// Stub the fetchCdn function to return the external schema when requested
	const externalSchema = {
		type: "object",
		properties: {
			id: {type: "string"},
			type: {type: "string"},
		},
		required: ["id", "type"],
	};
	fetchCdnStub.withArgs("externalSchema.json")
		.resolves(externalSchema);

	const result1 = await runValidation("/path/to/manifest.json");
	const result2 = await runValidation("/path/to/manifest.json");

	t.deepEqual(result1, {
		isValid: true,
		errors: [],
	});
	t.deepEqual(result2, {
		isValid: true,
		errors: [],
	});
	t.true(fetchCdnStub.calledOnce); // External schema fetched only once
});

test("runValidation patches external adaptive-card.json schema", async (t) => {
	const {runValidation, getManifestSchemaStub, fetchCdnStub} = t.context;

	t.context.manifestFileContent = JSON.stringify({
		_version: "1.0.0",
		adaptiveCards: {
			type: "AdaptiveCard",
		},
	});

	// Schema that references the adaptive-card.json schema
	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			_version: {type: "string"},
			adaptiveCards: {
				$ref: "https://adaptivecards.io/schemas/adaptive-card.json",
			},
		},
	});

	// Stub the fetchCdn function to return the adaptive-card.json schema when requested
	const adaptiveCardSchema = {
		type: "object",
		id: "https://adaptivecards.io/schemas/adaptive-card.json", // Note the "id" property
		properties: {
			type: {type: "string"},
		},
		required: ["type"],
	};
	fetchCdnStub.withArgs("https://adaptivecards.io/schemas/adaptive-card.json")
		.resolves(adaptiveCardSchema);

	const result = await runValidation("/path/to/manifest.json");

	t.deepEqual(result, {
		isValid: true,
		errors: [],
	});
});

test("runValidation handles properties with 'format=uri'", async (t) => {
	const {runValidation, getManifestSchemaStub} = t.context;

	// Stub the readFile function to return a manifest with invalid "$schema" URI
	t.context.manifestFileContent = JSON.stringify({
		_version: "1.0.0",
		$schema: "invalid-uri-format",
	});

	getManifestSchemaStub.resolves({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			_version: {type: "string"},
			$schema: {
				description: "A URI to the schema",
				format: "uri",
				type: "string",
			},
		},
		required: ["$schema"],
		additionalProperties: false,
	});

	const result = await runValidation("/path/to/manifest.json");

	t.is(result.isValid, false);
});
