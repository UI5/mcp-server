import path from "path";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";
import {createIntegrationCard} from "./create_integration_card.js";
import {inputSchema} from "./schema.js";
import {getLogger} from "@ui5/logger";

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
		log.info(`Creating a new Integration Card at ${params.basePath}`);
		log.info(`Card folder name: ${params.cardFolderName}`);
		log.info(`Card type: ${params.cardType}`);

		const normalizedBasePath = await context.normalizePath(params.basePath);
		const normalizedCardFolderName = path.join(normalizedBasePath, params.cardFolderName);
		const generatedFiles = await createIntegrationCard(normalizedCardFolderName, params.cardType);
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
