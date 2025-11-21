import {getTypescriptConversionGuidelines} from "./typescriptConversionGuidelines.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:convert_to_typescript");

export default function registerTool(registerTool: RegisterTool, _context: Context) {
	registerTool("convert_to_typescript", {
		description: "This tool MUST be called once before converting a " +
			"UI5 (SAPUI5/OpenUI5) project from JavaScript to TypeScript. " +
			"The instructions provided by this tool MUST be followed to ensure " +
			"that the project setup and code is correctly converted.",
		annotations: {
			title: "Get TypeScript Conversion Guidelines",
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async () => {
		log.info("Retrieving TypeScript conversion guidelines...");
		const guidelines = await getTypescriptConversionGuidelines();
		return {
			content: [
				{
					type: "text",
					text: guidelines,
				},
			],
		};
	});
}
