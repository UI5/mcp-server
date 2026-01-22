import {getLogger} from "@ui5/logger";
import {fetchCdn} from "./cdnHelper.js";
import {Mutex} from "async-mutex";
import semver from "semver";

const log = getLogger("utils:ui5Manifest");

const schemaCache = new Map<string, object>();
const fetchSchemaMutex = new Mutex();

let UI5ToManifestVersionMapping: Record<string, string> | null = null;
const MAPPING_URL = "https://raw.githubusercontent.com/UI5/manifest/main/mapping.json";
const ui5ToManifestVersionMappingMutex = new Mutex();

// Manifests prior to 1.69.0 use older meta-schema, which is not supported by the current implementation
const LOWEST_SUPPORTED_MANIFEST_VERSION = "1.69.0";

function getSchemaURL(manifestVersion: string) {
	return `https://raw.githubusercontent.com/UI5/manifest/v${manifestVersion}/schema.json`;
}

async function getUI5toManifestVersionMapping() {
	const release = await ui5ToManifestVersionMappingMutex.acquire();

	try {
		if (UI5ToManifestVersionMapping) {
			log.info("Loading cached UI5 to manifest version mapping");
			return UI5ToManifestVersionMapping;
		}

		log.info("Fetching UI5 to manifest version mapping");
		const mapping = await fetchCdn(MAPPING_URL);
		log.info(`Fetched UI5 to manifest version mapping from ${MAPPING_URL}`);

		UI5ToManifestVersionMapping = mapping as Record<string, string>;

		return UI5ToManifestVersionMapping;
	} finally {
		release();
	}
}

async function fetchSchema(manifestVersion: string) {
	const release = await fetchSchemaMutex.acquire();

	try {
		if (schemaCache.has(manifestVersion)) {
			log.info(`Loading cached schema for manifest version: ${manifestVersion}`);
			return schemaCache.get(manifestVersion)!;
		}

		log.info(`Fetching schema for manifest version: ${manifestVersion}`);
		const schemaURL = getSchemaURL(manifestVersion);
		const schema = await fetchCdn(schemaURL);
		log.info(`Fetched UI5 manifest schema from ${schemaURL}`);

		schemaCache.set(manifestVersion, schema);

		return schema;
	} finally {
		release();
	}
}

async function failWithSupportedVersionsHint(errorMessage: string): Promise<never> {
	let supportedVersions;

	try {
		const versionMap = await getUI5toManifestVersionMapping();
		supportedVersions = [
			...new Set(
				Object.values(versionMap).filter(
					(version) => semver.gte(version, LOWEST_SUPPORTED_MANIFEST_VERSION)
				)
			),
		];
	} catch (_) {
		supportedVersions = null;
	};

	throw new Error(
		errorMessage +
		(supportedVersions ?
			`\nSupported versions are: ${supportedVersions.join(", ")}.` :
			"")
	);
}

/**
 * Get the manifest schema for a specific manifest version.
 * @param manifestVersion The manifest version
 * @returns The manifest schema
 * @throws Error if the manifest version is unsupported
 */
export async function getManifestSchema(manifestVersion: string): Promise<object> {
	if (semver.lt(manifestVersion, LOWEST_SUPPORTED_MANIFEST_VERSION)) {
		return failWithSupportedVersionsHint(
			`Manifest version '${manifestVersion}' is not supported. Please upgrade to a newer one.`
		);
	}

	try {
		return await fetchSchema(manifestVersion);
	} catch (error) {
		return failWithSupportedVersionsHint(
			`Failed to fetch schema for manifest version '${manifestVersion}': ` +
			`${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Get the manifest version from the manifest object.
 * @param manifest The manifest object
 * @returns The manifest version
 * @throws Error if the manifest version is missing or invalid
 */
export async function getManifestVersion(manifest: object): Promise<string> {
	if (!("_version" in manifest)) {
		return failWithSupportedVersionsHint("Manifest does not contain a '_version' property.");
	}

	if (typeof manifest._version !== "string") {
		return failWithSupportedVersionsHint("Manifest '_version' property is not a string.");
	}

	if (!semver.valid(manifest._version)) {
		return failWithSupportedVersionsHint("Manifest '_version' property is not a valid semantic version.");
	}

	return manifest._version;
}

/**
 * @returns The latest manifest version
 */
export async function getLatestManifestVersion() {
	const versionMap = await getUI5toManifestVersionMapping();

	if (!versionMap.latest) {
		throw new Error("Could not determine latest manifest version.");
	}

	return versionMap.latest;
}
