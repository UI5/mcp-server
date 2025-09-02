import fetch from "make-fetch-happen";
import {InvalidInputError} from "../utils.js";
import {Ui5Framework} from "./ui5Framework.js";

/**
 * Get the base URL for the UI5 CDN based on the framework
 * @param frameworkName The UI5 framework (OpenUI5 or SAPUI5)
 * @returns The CDN base URL
 */
export function getBaseUrl(frameworkName: Ui5Framework, frameworkVersion?: string): string {
	let baseUrl;
	switch (frameworkName) {
		case "OpenUI5":
			baseUrl = "https://sdk.openui5.org";
			break;
		case "SAPUI5":
			baseUrl = "https://ui5.sap.com";
			break;
		default:
			// This should never happen due to TypeScript's type checking,
			// but we handle it anyway for runtime safety
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new InvalidInputError(`Unknown framework: ${frameworkName}`);
	}
	if (frameworkVersion) {
		baseUrl += `/${frameworkVersion}`;
	}
	return baseUrl;
}

export async function fetchCdnRaw(url: string) {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`The requested resource does not exist`);
			} else {
				throw new Error(
					`The requested resource returned unexpected status "${response.status} - ${response.statusText}"`);
			}
		}

		return response;
	} catch (error) {
		throw new Error(
			`Failed to fetch resource from CDN. Error: ${error instanceof Error ? error.message : String(error)} ` +
			`for URL: ${url}`,
			{cause: error}
		);
	}
}

export async function fetchCdn(url: string): Promise<object> {
	const res = await fetchCdnRaw(url);
	return await res.json() as unknown as object;
}
