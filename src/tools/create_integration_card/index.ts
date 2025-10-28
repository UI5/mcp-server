import path from "path";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";
import {createIntegrationCard} from "./create_integration_card.js";
import {inputSchema} from "./schema.js";
import {getLogger} from "@ui5/logger";
import {getLatestManifestVersion} from "../../utils/ui5Manifest.js";

const log = getLogger("tools:create_integration_card");

export default function registerTool(registerTool: RegisterTool, context: Context) {
	return registerTool("create_integration_card", {
		title: "Create Integration Card",
		description: "Create a new Integration Card, UI Integration Card, or UI5 Integration Card",
		annotations: {
			title: "Create Integration Card",
			readOnlyHint: false,
		},
		inputSchema,
	}, async (params) => {
		const latestManifestVersion = await getLatestManifestVersion();
		log.info(`Creating a new Integration Card at ${params.basePath}`);
		log.info(`Card folder name: ${params.cardFolderName}`);
		log.info(`Card type: ${params.cardType}`);
		log.info(`Using manifest version: ${latestManifestVersion}`);

		const normalizedBasePath = await context.normalizePath(params.basePath);
		const normalizedCardFolderName = path.join(normalizedBasePath, params.cardFolderName);

		if (!normalizedCardFolderName.startsWith(normalizedBasePath + path.sep)) {
			throw new Error(
				`Card folder path ${normalizedCardFolderName} is not within base path ${normalizedBasePath}`
			);
		}

		const generatedFiles = await createIntegrationCard({
			folderPath: normalizedCardFolderName,
			cardType: params.cardType,
			manifestVersion: latestManifestVersion,
		});
		const message = `Successfully created Integration Card ${params.cardFolderName} at ${normalizedBasePath}\n` +
			`The generated files inside ${normalizedCardFolderName} are:\n${generatedFiles.join("\n")}`;

		return {
			content: [{
				type: "text",
				text: message,
			}],
		};
	});
}
