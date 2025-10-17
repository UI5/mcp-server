import {fetchCdn} from "./cdnHelper.js";

const MAPPING_URL = "https://raw.githubusercontent.com/SAP/ui5-manifest/main/mapping.json";

async function getUI5toManifestVersionMap() {
	const mapping = await fetchCdn(MAPPING_URL);

	return mapping as Record<string, string>;
}

export async function getLatestManifestVersion() {
	const versionMap = await getUI5toManifestVersionMap();

	if (!versionMap.latest) {
		throw new Error("Could not determine latest manifest version.");
	}

	return versionMap.latest;
}
