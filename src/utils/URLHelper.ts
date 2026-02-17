import {getLogger} from "@ui5/logger";
import {InvalidInputError} from "../utils.js";

const log = getLogger("tools:create_ui5_app:create_ui5_app");

/**
 * Validates a URL against a set of specified rules, including protocol and domain allow lists.
 *
 * @param urlString The string to validate as a URL.
 * @param domainAllowList An array of allowed domain names.
 *                        - An empty array allows any domain.
 *                        - e.g., ["localhost", "example.com", "sub.example.com"]
 *                        - For wildcard subdomains, prefix the domain with a dot: ".example.com".
 *                          This will match "www.example.com" but not "example.com".
 * @param protocolAllowList An array of allowed protocols (without the trailing colon).
 *                         - An empty array allows any protocol.
 *                         - e.g., ["http", "https"]
 * @returns `true` if the URL is valid according to the rules, otherwise `false`.
 * @throws {InvalidInputError} if the URL's domain is not in the provided allow list.
 */
export function isValidUrl(
	urlString: string,
	domainAllowList: string[] = [],
	protocolAllowList: string[] = ["http", "https"]
): boolean {
	let url: URL;

	// 1. Validate URL structure using the WHATWG URL API.
	try {
		url = new URL(urlString);
	} catch (_err) {
		// If the URL constructor throws an error, the URL is malformed.
		return false;
	}

	// 2. Validate the protocol.
	if (protocolAllowList.length > 0) {
		// The `protocol` property includes the colon (e.g., "https:").
		// We remove it for a clean comparison.
		const urlProtocol = url.protocol.slice(0, -1);
		if (!protocolAllowList.includes(urlProtocol)) {
			return false;
		}
	}

	// 3. Validate the domain/hostname.
	if (domainAllowList.length > 0) {
		const hostname = url.hostname;

		const isDomainAllowed = domainAllowList.some((allowedDomain) => {
			// Wildcard domain check (e.g., ".example.com")
			if (allowedDomain.startsWith(".")) {
				// Must match the suffix and not be the root domain itself.
				// e.g., "api.example.com" ends with ".example.com"
				// e.g., "example.com" does NOT end with ".example.com"
				return hostname.endsWith(allowedDomain);
			}

			// Exact domain match
			return hostname === allowedDomain;
		});

		if (!isDomainAllowed) {
			throw new InvalidInputError(
				`Domain "${hostname}" is not allowed. Allowed domains are: ${domainAllowList.join(", ")}. See ` +
				`https://github.com/UI5/mcp-server#configuration for information on how to configure the allow list.`);
		}
	}

	// If all checks pass, the URL is valid.
	return true;
};

export function getAllowedDomains() {
	if ("UI5_MCP_SERVER_ALLOWED_DOMAINS" in process.env || "UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS" in process.env) {
		const inputDomainList = process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS ??
			process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS;
		if (!inputDomainList?.trim()) {
			// Empty list allows all domains
			log.verbose("Empty value for UI5_MCP_SERVER_ALLOWED_DOMAINS, allowing all domains");
			return [];
		}
		// Use the environment variable if set
		const domainList = inputDomainList.split(",").map((d) => d.trim());
		// Validate domains to catch user errors
		for (const domain of domainList) {
			try {
				// Note that the dot prefix (which we use for wildcards) is valid in a domain
				new URL(`https://${domain}`);
			} catch (err) {
				throw new InvalidInputError(
					`Invalid domain '${domain}' in UI5_MCP_SERVER_ALLOWED_DOMAINS: ` +
					(err instanceof Error ? err.message : String(err))
				);
			}
		}
		log.verbose(`${domainList.length} allowed OData V4 domains configured: ${domainList.join(", ")}`);
		return domainList;
	}
	return [
		// Default allowed domains for OData V4 services
		"localhost",
		"services.odata.org",
	];
}
