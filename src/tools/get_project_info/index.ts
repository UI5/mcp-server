import {inputSchema, outputSchema} from "./schema.js";
import getProjectInfo from "./getProjectInfo.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:get_project_info");

export default function registerTool(registerTool: RegisterTool, context: Context) {
	registerTool("get_project_info", {
		description: "Get general information about a local UI5 project.",
		annotations: {
			title: "UI5 Project Info",
			readOnlyHint: true,
			idempotentHint: true,
		},
		inputSchema,
		outputSchema,
	}, async ({projectDir}) => {
		log.info(`Retrieving project info for project at '${projectDir}'`);
		const resolvedProjectDir = await context.normalizePath(projectDir);
		const info = await getProjectInfo(resolvedProjectDir, true);
		return {
			content: [{
				type: "text",
				text: JSON.stringify(info, null, 2),
			}],
			structuredContent: info,
		};
	});
}
