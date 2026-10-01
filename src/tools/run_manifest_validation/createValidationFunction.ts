import {fetchCdn} from "../../utils/cdnHelper.js";
import Ajv2020, {AnySchemaObject, ValidateFunction} from "ajv/dist/2020.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {readFile} from "fs/promises";
import {getLogger} from "@ui5/logger";
import {Mutex} from "async-mutex";
import {fileURLToPath} from "url";

const log = getLogger("tools:run_manifest_validation:createValidationFunction");
const schemaCache = new Map<string, AnySchemaObject>();
const fetchSchemaMutex = new Mutex();

function isJsonSchemaDraft(uri: string, draft: "draft-06" | "draft-07"): boolean {
	return /^https?:\/\/json-schema\.org\/draft/.test(uri) &&
		uri.includes(`/${draft}/schema`);
}

const AJV_SCHEMA_PATHS = {
	draft06: fileURLToPath(import.meta.resolve("ajv/dist/refs/json-schema-draft-06.json")),
	draft07: fileURLToPath(import.meta.resolve("ajv/dist/refs/json-schema-draft-07.json")),
} as const;

async function createUI5ManifestValidateFunction2020(ui5Schema: object) {
	try {
		const draft06MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft06, "utf-8")
		) as AnySchemaObject;
		const draft07MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft07, "utf-8")
		) as AnySchemaObject;

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
				if (isJsonSchemaDraft(uri, "draft-06")) {
					return draft06MetaSchema;
				}
				if (isJsonSchemaDraft(uri, "draft-07")) {
					return draft07MetaSchema;
				}

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

		// Register meta-schemas so AJV can validate external schemas against their own
		// $schema declaration without falling into infinite loadSchema recursion.
		ajv.addMetaSchema(draft06MetaSchema, "http://json-schema.org/draft-06/schema#");
		ajv.addMetaSchema(draft07MetaSchema, "http://json-schema.org/draft-07/schema#");

		// Special handling for UI5 manifest schemas (e.g., v1.68.0) that use "items" as an array
		// In JSON Schema 2020-12, "items" must be an object or boolean, not an array
		// Arrays should use "prefixItems" instead
		// See: https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.1.2
		// See: https://github.com/UI5/manifest/issues/34
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
		const draft06MetaSchema = JSON.parse(
			await readFile(AJV_SCHEMA_PATHS.draft06, "utf-8")
		) as AnySchemaObject;

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
				if (isJsonSchemaDraft(uri, "draft-06")) {
					return draft06MetaSchema;
				}

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

		// Register meta-schema so AJV can validate external schemas against their own
		// $schema declaration without falling into infinite loadSchema recursion.
		ajv.addMetaSchema(draft06MetaSchema, "http://json-schema.org/draft-06/schema#");

		const validate = await ajv.compileAsync(ui5Schema);
		return validate;
	} catch (error) {
		throw new Error(`Failed to create UI5 manifest validate function: ` +
			`${error instanceof Error ? error.message : String(error)}`);
	}
}

export async function createValidateFunction(
	ui5ManifestSchema: object
): Promise<ValidateFunction> {
	// Determine which validator to use based on the $schema attribute
	const schema = ui5ManifestSchema as {$schema?: string};
	const metaSchema = schema?.$schema;

	if (metaSchema === "https://json-schema.org/draft/2020-12/schema") {
		log.info(`Using JSON Schema 2020-12 validation (detected from $schema: ${metaSchema})`);
		return createUI5ManifestValidateFunction2020(ui5ManifestSchema);
	} else if (metaSchema === "http://json-schema.org/draft-07/schema#") {
		log.info(`Using Draft-07 validation (detected from $schema: ${metaSchema})`);
		return createUI5ManifestValidateFunctionDraft07(ui5ManifestSchema);
	} else {
		throw new Error(
			`Failed to create UI5 manifest validate function:` +
			` ${metaSchema ?? "undefined"} is not a supported meta-schema. ` +
			`Supported meta-schemas: "https://json-schema.org/draft/2020-12/schema", "http://json-schema.org/draft-07/schema#"`
		);
	}
}
