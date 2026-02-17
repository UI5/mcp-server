import {getLogger} from "@ui5/logger";
import {InvalidInputError} from "../utils.js";

const log = getLogger("utils:getAllowedDomains");

export default function getAllowedDomains() {
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
		log.verbose(`${domainList.length} allowed domains configured: ${domainList.join(", ")}`);
		return domainList;
	}
	return [
		// Default allowed domains for services
		"localhost",
		"services.odata.org",
	];
}
