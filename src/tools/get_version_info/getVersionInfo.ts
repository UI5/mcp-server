import {GetVersionInfoParams, GetVersionInfoResult, VersionInfo} from "./types.js";
import {fetchCdn, getBaseUrl} from "../../utils/cdnHelper.js";
import {Mutex} from "async-mutex";
import {getLogger} from "@ui5/logger";

const log = getLogger("tools:get_version_info:getVersionInfo");

const cachedVersionInfo = new Map<string, VersionInfo>();
const versionInfoMutex = new Mutex();

/**
 * Fetch version information for the specified UI5 framework
 * @param framework The UI5 framework (OpenUI5 or SAPUI5)
 * @returns The version information
 * @throws {Error} If the version information cannot be fetched
 */
export default async function getVersionInfo(params: GetVersionInfoParams): Promise<GetVersionInfoResult> {
	if (cachedVersionInfo.has(params.frameworkName)) {
		return {versions: cachedVersionInfo.get(params.frameworkName)!};
	}
	const release = await versionInfoMutex.acquire();
	try {
		// Check again inside the mutex
		if (cachedVersionInfo.has(params.frameworkName)) {
			return {versions: cachedVersionInfo.get(params.frameworkName)!};
		}
		const baseUrl = getBaseUrl(params.frameworkName);
		const url = `${baseUrl}/version.json`;
		log.info(`Fetching version information for ${params.frameworkName} from ${url}`);

		const data = await fetchCdn(url);
		const versions = processVersionJson(data);
		cachedVersionInfo.set(params.frameworkName, versions);
		return {versions};
	} finally {
		release();
	}
}

function processVersionJson(rawJsonData: unknown): VersionInfo {
	if (!rawJsonData || typeof rawJsonData !== "object" || Array.isArray(rawJsonData)) {
		throw new Error("Invalid version.json format. Expected an object.");
	}
	return rawJsonData as VersionInfo;
}
