import {RunSchemaValidationResult} from "./schema.js";
import {readFile} from "fs/promises";
import {getLogger} from "@ui5/logger";
import {InvalidInputError} from "../../utils.js";
import {getManifestSchema, getManifestVersion} from "../../utils/ui5Manifest.js";
import {isAbsolute} from "path";
import {createValidateFunction} from "./createValidationFunction.js";

const log = getLogger("tools:run_manifest_validation:runValidation");

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
	const validate = await createValidateFunction(ui5ManifestSchema);
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
