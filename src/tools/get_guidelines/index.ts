import {getGuidelines} from "./guidelines.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:get_guidelines");

export default function registerTool(registerTool: RegisterTool, _context: Context) {
	registerTool("get_guidelines", {
		description: "This tool MUST be called once to retrieve UI5 guidelines " +
			"before working on any UI5 (SAPUI5/OpenUI5) related task or project " +
			"or creating a UI5 project. " +
			"The guidelines provided by this tool MUST be followed to ensure " +
			"best practices and avoid common pitfalls in UI5 development.",
		annotations: {
			title: "Get UI5 Guidelines",
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async () => {
		log.info("Retrieving UI5 guidelines...");
		const guidelines = await getGuidelines();
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
