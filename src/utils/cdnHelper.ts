import fetch from "make-fetch-happen";
import {getLogger} from "@ui5/logger";
import {InvalidInputError} from "../utils.js";
import {Ui5Framework} from "./ui5Framework.js";

const log = getLogger("utils:cdnHelper");

function getCustomCdnUrl(): string | undefined {
	const value = process.env.UI5_MCP_SERVER_CDN_URL;
	if (!value) {
		return undefined;
	}
	let url = value.trim();
	if (!url) {
		return undefined;
	}
	// Strip trailing slashes
	url = url.replace(/\/+$/, "");
	// Validate URL format
	try {
		new URL(url);
	} catch {
		throw new InvalidInputError(
			`Invalid URL '${value}' in UI5_MCP_SERVER_CDN_URL: ` +
			`The value must be a valid URL (e.g., "https://my-cdn.example.com")`
		);
	}
	log.info(`Using custom CDN URL from UI5_MCP_SERVER_CDN_URL: ${url}`);
	return url;
}

/**
 * Get the base URL for the UI5 CDN based on the framework
 * @param frameworkName The UI5 framework (OpenUI5 or SAPUI5)
 * @returns The CDN base URL
 */
export function getBaseUrl(frameworkName: Ui5Framework, frameworkVersion?: string): string {
	let baseUrl = getCustomCdnUrl();
	if (!baseUrl) {
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
	}
	if (frameworkVersion) {
		baseUrl += `/${frameworkVersion}`;
	}
	return baseUrl;
}

export async function fetchCdnRaw(url: string) {
	try {
		const response = await fetch(url);

		if (!response.ok || !response.body) {
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
	return await res.json() as object;
}
