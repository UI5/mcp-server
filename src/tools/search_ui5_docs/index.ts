import {searchDocs} from "./search.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";
import {z} from "zod";

const log = getLogger("tools:search_ui5_docs");

const searchSchema = z.object({
	query: z.string().describe("The search query for UI5 documentation"),
	limit: z.number().optional().default(5).describe("Number of results to return (default: 5)"),
});

export default function registerTool(registerTool: RegisterTool, _context: Context) {
	registerTool("search_ui5_docs", {
		description: "Search UI5 documentation using semantic search. " +
			"Returns relevant code snippets and documentation based on the query. " +
			"Use this tool to find specific UI5 documentation, accessibility best practice patterns, or examples.",
		inputSchema: searchSchema,
		annotations: {
			title: "Search UI5 Documentation",
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	}, async ({query, limit}) => {
		log.info(`Searching UI5 docs for: "${query}" (limit: ${limit})`);
		const results = await searchDocs(query, limit);

		let responseText = `Found ${results.length} results for: "${query}"\n\n`;

		results.forEach((result, i) => {
			const kindLabel = result.kind === "documentation" ? "[Documentation]" : "[Code]";
			responseText += `${i + 1}. [${result.score.toFixed(3)}] ${kindLabel} ${result.source}\n`;
			responseText += `   Summary: ${result.summary}\n\n`;

			if (result.kind === "documentation" && result.content) {
				responseText += `   Content:\n`;
				responseText += result.content.split("\n").map((line) => `      ${line}`).join("\n");
			} else if (result.code) {
				responseText += `   Code:\n`;
				responseText += result.code.split("\n").map((line) => `      ${line}`).join("\n");
			}
			responseText += "\n\n";
		});

		return {
			content: [
				{
					type: "text",
					text: responseText,
				},
			],
		};
	});
}
