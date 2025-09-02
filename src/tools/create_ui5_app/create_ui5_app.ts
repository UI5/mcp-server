import os from "os";
import path, {isAbsolute} from "path";
import {fileURLToPath} from "url";
import {mkdir} from "fs/promises";
import semver from "semver";
import {execa} from "execa";
import {getLatestUi5Version} from "./ui5Version.js";
import {processTemplates} from "./templateProcessor.js";
import ODataMetadata from "./ODataMetadata.js";
import {CreateUi5AppParams, CreateUi5AppResult} from "./schema.js";
import {getLogger} from "@ui5/logger";
import {isUi5Framework, Ui5Framework} from "../../utils/ui5Framework.js";
import {dirExists, InvalidInputError} from "../../utils.js";
import isValidUrl from "./isValidUrl.js";

const log = getLogger("tools:create_ui5_app:create_ui5_app");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const minFwkVersion = {
	OpenUI5: "1.96.0",
	SAPUI5: "1.96.0",
};

const minFwkVersionJS = {
	OpenUI5: "1.96.0",
	SAPUI5: "1.96.0",
};

const fwkCDNDomain = {
	OpenUI5: "sdk.openui5.org",
	SAPUI5: "ui5.sap.com",
};

function getTypePackageFor(framework: Ui5Framework, version = "99.99.99") {
	const typesName = semver.gte(version, "1.113.0") ? "types" : "ts-types-esm";
	return `@${framework.toLowerCase()}/${typesName}`;
}

/**
 * Creates a new SAPUI5/OpenUI5 application using templating.
 *
 * @param {CreateUi5AppParams} params - Parameters for the application to be created.
 * @returns {Promise<CreateUi5AppResult>} Result object indicating success, message, and final location.
 */
export async function createUi5App(params: CreateUi5AppParams): Promise<CreateUi5AppResult> {
	const {
		appNamespace,
		framework = "SAPUI5",
		frameworkVersion = await getLatestUi5Version(params.framework ?? "SAPUI5"),
		author = os.userInfo().username || "Developer",
		createAppDirectory = true,
		oDataV4Url,
		oDataEntitySet,
		entityProperties = [],
		initializeGitRepository = true,
		runNpmInstall = true,
		basePath,
		typescript = true,
	} = params;

	// Validate parameters

	if (!isUi5Framework(framework)) {
		throw new InvalidInputError("The provided framework is not valid! Please use either OpenUI5 or SAPUI5.");
	}

	if (!semver.valid(frameworkVersion)) {
		throw new InvalidInputError(
			"The provided framework version is not valid! Please use a semantic version, e.g. 1.136.0");
	}

	const minFwkVersionToUse = typescript ?
		minFwkVersion[framework] :
		minFwkVersionJS[framework];
	if (semver.lt(frameworkVersion, minFwkVersionToUse)) {
		throw new InvalidInputError(
			`The provided framework version ${frameworkVersion} is not valid!
The minimum version for ${framework} is ${minFwkVersionToUse}.`
		);
	}

	let metadata, metadataUrl;
	if (oDataV4Url) {
		metadataUrl = oDataV4Url;
		if (oDataV4Url.startsWith("/")) {
			metadataUrl = `http://localhost:4004${oDataV4Url}`;
		}
		const allowedDomains = getAllowedOdataV4Domains();
		if (!isValidUrl(metadataUrl, allowedDomains)) {
			let allowedDomainsNote = "";
			if (allowedDomains.length) {
				allowedDomainsNote =
					`As per the MCP server configuration, only the following domains are currently allowed: ` +
					`'${allowedDomains.join("', '")}'. See https://github.com/UI5/mcp-server#configuration ` +
					`for information on how to configure the allow list.`;
			}
			throw new InvalidInputError(
				`The provided OData V4 service URL is not valid. It must be either an absolute URL` +
				`starting with http:// or https:// or pathname like '/odata/v4/serviceName' in case ` +
				`the OData service is exposed on the same server as the application. In this case, ` +
				`the protocol and host 'http://localhost:4004' will be assumed and used by this tool for inquiries ` +
				`about the service. ${allowedDomainsNote}`
			);
		}
		try {
			metadata = await ODataMetadata.load(metadataUrl);
		} catch (err) {
			// Silently ignore metadata loading errors
			// Many services require proxies or authentication, which is out of scope for this tool
			log.info(
				`Failed to load OData V4 metadata from ${metadataUrl}: ` +
				` ${err instanceof Error ? err.message : String(err)}` +
				" This means the given entity and properties will not be verified and when no properties are" +
				" given, there is no automatic display of some properties."
			);
		}
	}

	// let metadataEntityKeys: string[] | undefined;
	let metadataEntityProperties: string[] | undefined;
	if (oDataEntitySet && metadata) {
		if (!metadata.getEntitySet(oDataEntitySet)) {
			throw new InvalidInputError(
				`The provided OData V4 entity set '${oDataEntitySet}' does not exist in the service metadata. ` +
				`Please check the entity set name and ensure it is correct or omit it to generate the app ` +
				`without data in the UI.`
			);
		}

		metadataEntityProperties = metadata.getProperties(oDataEntitySet);
		// metadataEntityKeys = metadata.getKeys(oDataEntitySet);

		if (entityProperties) {
			// Validate provided entity properties against metadata
			for (const prop of entityProperties) {
				if (!metadataEntityProperties?.includes(prop)) {
					// remove the property from the list if it doesn't exist in the entity
					const index = entityProperties.indexOf(prop);
					if (index !== -1) {
						entityProperties.splice(index, 1);
					}
				}
			}
		}

		if (entityProperties.length === 0) {
			// Use the first five properties from the metadata if none were provided/existing
			entityProperties.push(...(metadataEntityProperties?.slice(0, 5) ?? []));
		}
	}

	if (!isAbsolute(basePath)) {
		throw new InvalidInputError(
			"The provided base path is not valid! Please provide an absolute path to the target directory."
		);
	}

	try {
		// if the directory does not exist, create it
		await mkdir(basePath, {recursive: true});
	} catch (dirError) {
		throw new InvalidInputError(
			`Failed to create base path '${basePath}': ${dirError instanceof Error ?
				dirError.message :
					String(dirError)}` +
					" Please ensure the path is valid and as intended and you have write permissions.",
			{cause: dirError}
		);
	}
	const finalLocation = createAppDirectory ? path.join(basePath, appNamespace) : basePath;

	// Create app directory if needed
	if (createAppDirectory) {
		// Check directory does not already exist
		if (await dirExists(finalLocation)) {
			throw new InvalidInputError(
				`Target directory '${finalLocation}' already exists. ` +
				"Please choose a different namespace or base path or remove the existing directory."
			);
		}
		await mkdir(finalLocation, {recursive: true});
	}

	// build the final OData V4 URL, which must be relative when starting with localhost as server because
	// "localhost" won't work when deployed. Also, ensure it ends with a slash because the ODataModel
	// requires this.
	let finalODataV4Url = oDataV4Url?.match(/^https?:\/\/localhost:\d+/) ?
			oDataV4Url.replace(/^https?:\/\/localhost:\d+/, "") :
		oDataV4Url;
	if (finalODataV4Url && !finalODataV4Url?.endsWith("/")) {
		finalODataV4Url += "/";
	}

	// This allows us to apply an ODataModel setting (earlyRequests: true), which is recommended for
	// servers that require x-csrf tokens. But this setting breaks with other servers.
	// Details how this setting and x-csrf tokens are related are discussed in
	// https://github.com/UI5/openui5/issues/2288
	// As result, we want to enable earlyRequests only when we are very sure that it doesn't break anything
	// -- i.e. for local CAP servers, which are known to require x-csrf tokens and are typically running on
	// localhost:4004 at development time. This should at least cover a common use case.
	// TODO: Could also find out with requests when server is alive?
	const serverRequiresXCSRF = !!metadataUrl?.includes("localhost:4004");

	let escapedOdataV4Url;
	if (finalODataV4Url) {
		// Always stringify the URL to ensure special characters like quotes
		// do not break the JSON templates it is injected into
		escapedOdataV4Url = JSON.stringify(finalODataV4Url).slice(1, -1); // Remove leading and trailing quotes
	}

	// Generate template variables
	const templateVars = {
		namespace: appNamespace,
		framework: framework,
		frameworkVersion,
		author,
		...(typescript && {
			tstypes: getTypePackageFor(framework, frameworkVersion),
			tstypesVersion: frameworkVersion,
		}),
		appId: appNamespace,
		appURI: appNamespace.split(".").join("/"),
		cdnDomain: fwkCDNDomain[framework],
		oDataV4Url: escapedOdataV4Url,
		oDataEntitySet,
		entityProperties,
		serverRequiresXCSRF,
		defaultTheme: semver.gte(frameworkVersion, "1.108.0") ? "sap_horizon" : "sap_fiori_3",
		qunitCoverageFile: semver.gte(frameworkVersion, "1.113.0") ?
			"qunit-coverage-istanbul.js" :
			"qunit-coverage.js",
		gte1_98_0: semver.gte(frameworkVersion, "1.98.0"),
		gte1_100_0: semver.gte(frameworkVersion, "1.100.0"),
		gte1_104_0: semver.gte(frameworkVersion, "1.104.0"),
		lt1_110_0: semver.lt(frameworkVersion, "1.110.0"),
		gte1_115_0: semver.gte(frameworkVersion, "1.115.0"),
		gte1_120_0: semver.gte(frameworkVersion, "1.120.0"),
		lt1_124_0: semver.lt(frameworkVersion, "1.124.0"),
	};

	// Process template files
	const templateDir = path.join(__dirname, "..", "..", "..", "resources", typescript ?
		"template-ts" :
		"template-js");
	const generatedFiles = await processTemplates({
		templateDir,
		targetDir: finalLocation,
		templateVars,
		versionSpecificLogic: {
			lt1_124_0: templateVars.lt1_124_0,
		},
	});

	if (runNpmInstall) {
		// Run npm install
		await execa("npm", ["install"], {
			cwd: finalLocation,
			stdout: process.stderr,
		});
	}

	// Initialize git repository if requested
	if (initializeGitRepository) {
		await execa("git", ["init", "--quiet"], {
			cwd: finalLocation,
			stdout: process.stderr,
		});
		await execa("git", ["add", "."], {
			cwd: finalLocation,
			stdout: process.stderr,
		});
		await execa("git", ["commit", "--quiet", "--allow-empty", "-m", "Initial commit"], {
			cwd: finalLocation,
			stdout: process.stderr,
		});
	}

	return {
		message: `${framework} ${typescript ? "TypeScript" : "JavaScript"} application ` +
			`${appNamespace} created successfully.`,
		finalLocation,
		generatedFiles, // array of generated file paths, relative to finalLocation
		basePath,
		appInfo: {
			appNamespace,
			framework: framework,
			frameworkVersion,
			finalODataV4Url,
			oDataEntitySet,
			entityProperties: entityProperties ?? [],
			npmInstallExecuted: runNpmInstall,
			gitInitialized: initializeGitRepository,
			typescript,
		},
	};
}

function getAllowedOdataV4Domains() {
	if ("UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS" in process.env) {
		const inputDomainList = process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS;
		if (!inputDomainList?.trim()) {
			// Empty list allows all domains
			log.verbose("Empty value for UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS, allowing all domains");
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
					`Invalid domain '${domain}' in UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS: ` +
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
