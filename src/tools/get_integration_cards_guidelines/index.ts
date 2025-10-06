import {getGuidelines} from "./guidelines.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:get_integration_cards_guidelines");

export default function registerTool(registerTool: RegisterTool, _context: Context) {
	registerTool("get_integration_cards_guidelines", {
		title: "Get Integration Cards Guidelines",
		description: "This tool MUST be called once to retrieve Integration Cards guidelines " +
			"before working on any Integration Card related task or creating an Integration Card. " +
			"The guidelines provided by this tool MUST be followed to ensure " +
			"best practices and avoid common pitfalls in Integration Cards development." +
			"Integration Cards are also called 'UI Integration Cards' or 'UI5 Integration Cards'.",
		annotations: {
			title: "Get Integration Cards Guidelines",
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async () => {
		log.info("Retrieving Integration Cards guidelines...");
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
