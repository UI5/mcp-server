import {mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import {createWriteStream} from "node:fs";
import path from "node:path";
import {getLogger} from "@ui5/logger";
import {dirExists, fileExists, InvalidInputError} from "../../../utils.js";
import {fetchCdn, fetchCdnRaw, getBaseUrl} from "../../../utils/cdnHelper.js";
import {getDataDir, synchronize} from "../../../utils/dataStorageHelper.js";
import {isUi5Framework, Ui5Framework} from "../../../utils/ui5Framework.js";
import {pipeline} from "node:stream/promises";
import {ApiJSON} from "./api-json.js";

const log = getLogger("tools:get_api_reference:resources");

interface ApiReferenceIndexEntry {
	/**
	 * Value of the "name" property of the respective symbol in the api.json
	 */
	name: string;
	/**
	 * Path to the api.json file containing the symbol, relative to the directory containing the index.json
	 */
	filePath: string;
}

export type ApiReferenceIndex = Record<string, ApiReferenceIndexEntry>;

export async function getApiJsonDir(
	frameworkName: Ui5Framework, frameworkVersion: string
): Promise<string> {
	frameworkVersion = frameworkVersion.toLowerCase();
	// Validate input params since they are used to construct a file path
	if (!isUi5Framework(frameworkName)) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw new InvalidInputError(`Invalid framework name: ${frameworkName}. Expected "OpenUI5" or "SAPUI5".`);
	}
	if (typeof frameworkVersion !== "string" || /^[a-zA-Z0-9.-]+$/.exec(frameworkVersion) === null) {
		throw new InvalidInputError(`Invalid framework version: ${frameworkVersion}`);
	}
	const dirName = `${frameworkName.toLowerCase()}-${frameworkVersion}`;
	const apiJsonRootDir = getDataDir("api_json_files");
	const targetDir = path.join(apiJsonRootDir, dirName);
	if (await dirExists(targetDir)) {
		if (!await fileExists(path.join(targetDir, "index.json"))) {
			// Missing index.json indicates use of an old version of the UI5 MCP server
			// Remove the directory and re-fetch resources
			log.warn(`Incomplete API JSON data found for ${frameworkName} version ${frameworkVersion}, re-fetching...`);
			await rm(targetDir, {recursive: true, force: true});
		} else {
			// Use cached data
			return targetDir;
		}
	}
	await synchronize(dirName, async () => {
		// Check again whether dir exists by now
		if (await dirExists(targetDir)) {
			// Use cached data
			return;
		}
		log.info(`Fetching API JSON files for ${frameworkName} version ${frameworkVersion}...`);
		const stagingDir = path.join(apiJsonRootDir, "staging", dirName);
		try {
			// Ensure that the parent directory exists, but do not create the target directory
			// as this causes an EPERM error in following rename operation on Windows
			await mkdir(path.dirname(targetDir), {recursive: true});
			const filePaths = await fetchApiJsons(stagingDir, frameworkName, frameworkVersion);
			await _createApiIndex(stagingDir, filePaths);
			// Move staging directory to target directory
			await rename(stagingDir, targetDir);
		} catch (e) {
			if (e instanceof Error) {
				log.error(e.message);
				if (e.cause && e.cause instanceof Error) {
					log.error(`Cause: ${e.cause.message}`);
				}
			}
			await rm(targetDir, {recursive: true, force: true});
			throw e;
		} finally {
			// Always cleanup staging directory
			await rm(stagingDir, {recursive: true, force: true});
		}
	});
	return targetDir;
}

export async function fetchApiJsons(
	targetDir: string, frameworkName: Ui5Framework, frameworkVersion: string
): Promise<string[]> {
	await mkdir(targetDir, {recursive: true});
	// Create a base URL like "https://ui5.sap.com/1.120.30" or "https://sdk.openui5.org/1.120.30"
	const baseUrl = getBaseUrl(frameworkName, frameworkVersion);
	// Get all libraries for version
	const libraryNames = await getLibrariesForVersion(baseUrl);
	const filePaths = await Promise.all(libraryNames.map(async (libName) => {
		try {
			const targetPath = path.join(targetDir, `${libName}.api.json`);
			const url = `${baseUrl}/test-resources/${libName.replaceAll(".", "/")}/designtime/api.json`;
			return await _fetchApiJson(targetPath, url);
		} catch (err) {
			if (err instanceof Error &&
				err.message.includes("The requested resource does not exist") &&
				libName !== "sap.ui.core") {
				// Ignore 404 errors for libraries that might not have an API JSON file
				// always throw for core to catch general issues with the URL
				return;
			}
			throw err;
		}
	}));
	return filePaths.filter((p): p is string => !!p); // Filter out undefined entries
}

export async function _createApiIndex(targetDir: string, apiJsonPaths: string[]) {
	const indexMap = new Map<string, ApiReferenceIndexEntry>();

	await Promise.all(apiJsonPaths.map(async (apiJsonPath) => {
		const apiJson = await readFile(apiJsonPath, "utf-8");
		const apiJsonParsed = JSON.parse(apiJson) as ApiJSON;
		for (const symbol of apiJsonParsed.symbols) {
			let moduleName = symbol.name.toLowerCase();
			if (moduleName.startsWith("module:")) {
				// Normalize module names
				moduleName = moduleName.substring("module:".length).replaceAll("/", ".");
			}
			if (indexMap.has(moduleName)) {
				log.verbose(`Duplicate symbol name found: ${moduleName} in ${apiJsonPath}`);
				// Ignore this entry unless it matches the module name exactly
				if (moduleName !== symbol.module) {
					continue;
				}
			}

			indexMap.set(moduleName, {
				name: symbol.name,
				filePath: path.relative(targetDir, apiJsonPath),
			});
		}
	}));
	const indexPath = path.join(targetDir, "index.json");
	await writeFile(indexPath, JSON.stringify(Object.fromEntries(indexMap), null, 4), "utf-8");
}

export async function _fetchApiJson(targetPath: string, url: string) {
	const response = await fetchCdnRaw(url);
	await pipeline(
		response.body,
		createWriteStream(targetPath)
	);
	return targetPath;
}

interface SapUiVersionJson {
	libraries: {
		name: string;
		npmPackageName: string;
	}[];
}

export async function getLibrariesForVersion(baseUrl: string): Promise<string[]> {
	const url = `${baseUrl}/resources/sap-ui-version.json`;
	const sapUiVersionJson = await fetchCdn(url) as SapUiVersionJson;
	return sapUiVersionJson.libraries
		.filter(({name, npmPackageName}) => {
			return !!npmPackageName && !name.startsWith("themelib_");
		})
		.map(({name}) => {
			return name;
		});
}
