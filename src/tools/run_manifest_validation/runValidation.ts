import {fetchCdn} from "../../utils/cdnHelper.js";
import {RunSchemaValidationResult} from "./schema.js";
import Ajv2020, {AnySchemaObject} from "ajv/dist/2020.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFile} from "fs/promises";
import {getLogger} from "@ui5/logger";
import {InvalidInputError} from "../../utils.js";
import {getManifestSchema, getManifestVersion} from "../../utils/ui5Manifest.js";
import {Mutex} from "async-mutex";
import {fileURLToPath} from "url";
import {isAbsolute} from "path";
import semver from "semver";

const log = getLogger("tools:run_manifest_validation:runValidation");
const schemaCache = new Map<string, AnySchemaObject>();
const fetchSchemaMutex = new Mutex();

const AJV_SCHEMA_PATHS = {
	draft06: fileURLToPath(import.meta.resolve("ajv/dist/refs/json-schema-draft-06.json")),
	draft07: fileURLToPath(import.meta.resolve("ajv/dist/refs/json-schema-draft-07.json")),
} as const;

async function createUI5ManifestValidateFunction2020(ui5Schema: object) {
	try {
		const ajv = new Ajv2020.default({
			// Collect all errors, not just the first one
			allErrors: true,
			// Allow additional properties that are not in schema such as "i18n",
			// otherwise compilation fails
			strict: false,
			// Don't use Unicode-aware regular expressions,
			// otherwise compilation fails with "Invalid escape" errors
			unicodeRegExp: false,
			loadSchema: async (uri) => {
				const release = await fetchSchemaMutex.acquire();

				try {
					if (schemaCache.has(uri)) {
						log.info(`Loading cached schema: ${uri}`);
						return schemaCache.get(uri)!;
					}

					log.info(`Loading external schema: ${uri}`);
					const schema = await fetchCdn(uri) as AnySchemaObject;

					// Special handling for Adaptive Card schema to fix unsupported "id" property
					// According to the JSON Schema spec Draft 06 (used by Adaptive Card schema),
					// "$id" should be used instead of "id"
					// See https://github.com/microsoft/AdaptiveCards/issues/9274
					if (uri.includes("adaptive-card.json") && typeof schema.id === "string") {
						schema.$id = schema.id;
						delete schema.id;
					}

					schemaCache.set(uri, schema);

					return schema;
				} catch (error) {
					log.warn(`Failed to load external schema ${uri}:` +
						`${error instanceof Error ? error.message : String(error)}`);

					throw error;
				} finally {
					release();
				}
			},
		});

		addFormats.default(ajv);

		const draft06MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft06, "utf-8")
		) as AnySchemaObject;
		const draft07MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft07, "utf-8")
		) as AnySchemaObject;

		// Add meta-schemas for draft-06 and draft-07.
		// These are required to support schemas that reference these drafts,
		// for example the Adaptive Card schema and some sap.bpa.task properties.

		ajv.addMetaSchema(draft06MetaSchema, "http://json-schema.org/draft-06/schema#");
		ajv.addMetaSchema(draft07MetaSchema, "http://json-schema.org/draft-07/schema#");

		// Special handling for UI5 manifest schemas (e.g., v1.68.0) that use "items" as an array
		// In JSON Schema 2020-12, "items" must be an object or boolean, not an array
		// Arrays should use "prefixItems" instead
		// See: https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.1.2
		interface SchemaWithDefs {
			$defs?: Record<string, {
				oneOf?: {
					items?: unknown;
					prefixItems?: unknown;
				}[];
			}>;
		}

		const schemaToCompile = ui5Schema as SchemaWithDefs & AnySchemaObject;
		if (schemaToCompile?.$defs) {
			for (const defKey in schemaToCompile.$defs) {
				const def = schemaToCompile.$defs[defKey];
				if (def?.oneOf) {
					for (const option of def.oneOf) {
						if (Array.isArray(option?.items)) {
							option.prefixItems = option.items;
							delete option.items;
						}
					}
				}
			}
		}

		const validate = await ajv.compileAsync(schemaToCompile);
		return validate;
	} catch (error) {
		throw new Error(`Failed to create UI5 manifest validate function: ` +
			`${error instanceof Error ? error.message : String(error)}`);
	}
}

async function createUI5ManifestValidateFunctionDraft07(ui5Schema: object) {
	try {
		const ajv = new Ajv.default({
			// Collect all errors, not just the first one
			allErrors: true,
			// Allow additional properties that are not in schema such as "i18n",
			// otherwise compilation fails
			strict: false,
			// Don't use Unicode-aware regular expressions,
			// otherwise compilation fails with "Invalid escape" errors
			unicodeRegExp: false,
			loadSchema: async (uri) => {
				const release = await fetchSchemaMutex.acquire();

				try {
					if (schemaCache.has(uri)) {
						log.info(`Loading cached schema: ${uri}`);
						return schemaCache.get(uri)!;
					}

					log.info(`Loading external schema: ${uri}`);
					const schema = await fetchCdn(uri) as AnySchemaObject;

					// Special handling for Adaptive Card schema to fix unsupported "id" property
					// According to the JSON Schema spec Draft 06 (used by Adaptive Card schema),
					// "$id" should be used instead of "id"
					// See https://github.com/microsoft/AdaptiveCards/issues/9274
					if (uri.includes("adaptive-card.json") && typeof schema.id === "string") {
						schema.$id = schema.id;
						delete schema.id;
					}

					schemaCache.set(uri, schema);

					return schema;
				} catch (error) {
					log.warn(`Failed to load external schema ${uri}:` +
						`${error instanceof Error ? error.message : String(error)}`);

					throw error;
				} finally {
					release();
				}
			},
		});

		addFormats.default(ajv);

		const draft06MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft06, "utf-8")
		) as AnySchemaObject;

		// Add meta-schema for draft-06.
		// This is required to support schemas that reference this draft,
		// for example the Adaptive Card schema.
		ajv.addMetaSchema(draft06MetaSchema, "http://json-schema.org/draft-06/schema#");

		const validate = await ajv.compileAsync(ui5Schema);
		return validate;
	} catch (error) {
		throw new Error(`Failed to create UI5 manifest validate function: ` +
			`${error instanceof Error ? error.message : String(error)}`);
	}
}

async function readManifest(path: string) {
	let content: string;
	let json: object;

	if (!isAbsolute(path)) {
		throw new InvalidInputError(`The manifest path must be absolute: '${path}'`);
	}

	try {
		content = await readFile(path, "utf-8");
	} catch (error) {
		throw new InvalidInputError(`Failed to read manifest file at ${path}: ` +
			`${error instanceof Error ? error.message : String(error)}`);
	}

	try {
		json = JSON.parse(content) as object;
	} catch (error) {
		throw new InvalidInputError(`Failed to parse manifest file at ${path} as JSON: ` +
			`${error instanceof Error ? error.message : String(error)}`);
	}

	return json;
}

export default async function runValidation(manifestPath: string): Promise<RunSchemaValidationResult> {
	log.info(`Starting manifest validation for file: ${manifestPath}`);

	const manifest = await readManifest(manifestPath);
	const manifestVersion = await getManifestVersion(manifest);
	log.info(`Using manifest version: ${manifestVersion}`);
	const ui5ManifestSchema = await getManifestSchema(manifestVersion);
	let validate: Awaited<ReturnType<typeof createUI5ManifestValidateFunction2020>>;

	// v1.67.2 and onwards use JSON Schema 2020-12
	if (semver.compare(manifestVersion, "1.67.1") <= 0) {
		log.info("Using Draft-07 validation (manifest version <= v1.67.1)");
		validate = await createUI5ManifestValidateFunctionDraft07(ui5ManifestSchema);
	} else {
		log.info("Using JSON Schema 2020-12 validation (manifest version >= v1.67.2)");
		validate = await createUI5ManifestValidateFunction2020(ui5ManifestSchema);
	}

	const isValid = validate(manifest);

	if (isValid) {
		log.info("Manifest validation successful");

		return {
			isValid: true,
			errors: [],
		};
	}

	// Map AJV errors to our schema format
	const validationErrors = validate.errors ?? [];
	const errors = validationErrors.map((error): RunSchemaValidationResult["errors"][number] => {
		return {
			keyword: error.keyword ?? "",
			instancePath: error.instancePath ?? "",
			schemaPath: error.schemaPath ?? "",
			params: error.params ?? {},
			propertyName: error.propertyName,
			message: error.message,
		};
	});

	log.info(`Manifest validation failed with ${errors.length} error(s)`);

	return {
		isValid: false,
		errors: errors,
	};
}
