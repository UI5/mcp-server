import {mkdir, readFile, writeFile} from "fs/promises";
import {dirExists, InvalidInputError} from "../../utils.js";
import {globby} from "globby";
import path, {isAbsolute} from "path";
import {fileURLToPath} from "url";
import ejs from "ejs";
import {getLogger} from "@ui5/logger";
import {Destination, SupportedCardType} from "./schema.js";
import semver from "semver";
import getAllowedDomains from "../../utils/getAllowedDomains.js";
import isValidUrl from "../../utils/isValidUrl.js";

const log = getLogger("tools:create_integration_card:create_integration_card");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CreateIntegrationCardParams {
	folderPath: string;
	cardType: SupportedCardType;
	manifestVersion: string;
	destinations?: Destination[];
};

export async function createIntegrationCard({
	folderPath,
	cardType,
	manifestVersion,
	destinations,
}: CreateIntegrationCardParams) {
	if (!isAbsolute(folderPath)) {
		throw new InvalidInputError(
			"The provided folder path is not valid! Please provide an absolute path to the target directory."
		);
	}

	if (await dirExists(folderPath)) {
		throw new InvalidInputError(
			`The target directory '${folderPath}' already exists. ` +
			"Please choose a different path or remove the existing directory."
		);
	}

	if (!semver.valid(manifestVersion)) {
		throw new InvalidInputError("The provided manifest version is not valid!");
	}

	if (destinations?.length) {
		const allowedDomains = getAllowedDomains();

		for (const destination of destinations) {
			if (!isValidUrl(destination.defaultUrl, allowedDomains)) {
				let allowedDomainsNote = "";
				if (allowedDomains.length) {
					allowedDomainsNote =
						`As per the MCP server configuration, only the following domains are currently allowed: ` +
						`'${allowedDomains.join("', '")}'. See https://github.com/UI5/mcp-server#configuration ` +
						`for information on how to configure the allow list.`;
				}
				throw new InvalidInputError(
					`The provided destination 'defaultUrl' service URL is not valid.` +
					`It must be either an absolute URL` +
					`starting with http:// or https:// or pathname like '/api/v1/serviceName' in case ` +
					`the service is exposed on the same server as the application. In this case, ` +
					`the protocol and host 'http://localhost:4004' will be assumed and used by this tool for inquiries ` +
					`about the service. ${allowedDomainsNote}`
				);
			}
		}
	}

	try {
		// create target directory
		await mkdir(folderPath, {recursive: true});
	} catch (dirError) {
		throw new InvalidInputError(
			`Failed to create directory '${folderPath}': ` +
			`${dirError instanceof Error ? dirError.message : String(dirError) + "\n"} ` +
			"Please ensure the path is valid and as intended and you have write permissions.",
			{cause: dirError}
		);
	}

	const templateDir = path.join(__dirname, "..", "..", "..", "resources", "template-card");
	const filesPatterns = [
		"**",
		"!**/*.ejs",
	];
	const templateFiles = await globby(filesPatterns, {
		cwd: templateDir,
	});
	const generatedFiles = [];

	for (const file of templateFiles) {
		log.verbose(`Processing template file: ${file}`);
		const sourcePath = path.join(templateDir, file);
		const targetPath = path.join(folderPath, file);

		// Ensure target directory exists
		const targetDirPath = path.dirname(targetPath);
		await mkdir(targetDirPath, {recursive: true});

		try {
			// Read and process template
			const templateContent = await readFile(sourcePath, "utf8");
			const templateVars = {
				cardType,
				manifestVersion,
				destinations,
			};
			let processedContent = ejs.render(templateContent, templateVars, {filename: sourcePath});

			// format JSON files
			if (sourcePath.endsWith(".json")) {
				processedContent = JSON.stringify(JSON.parse(processedContent), null, "\t");
			}

			// Write processed file
			log.verbose(`Writing generated file to: ${targetPath}`);
			await writeFile(targetPath, processedContent);
			generatedFiles.push(path.relative(folderPath, targetPath));
		} catch (error) {
			log.error(`Error processing template file '${file}'`);
			throw new Error(
				`Failed to process template file '${file}': ` +
				`${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return generatedFiles;
};
