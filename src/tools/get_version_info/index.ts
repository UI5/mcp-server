/**
 * UI5 Version Info Tool
 *
 * This tool provides version information for UI5 (OpenUI5 and SAPUI5)
 * by fetching data from the respective version.json files.
 */

import getVersionInfo from "./getVersionInfo.js";
import {inputSchema, outputSchema} from "./schema.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:get_version_info");

export default function registerTool(registerTool: RegisterTool, _context: Context) {
	registerTool("get_version_info", {
		description: "Get version information for UI5 (OpenUI5 or SAPUI5)",
		annotations: {
			title: "UI5 Version Info",
			readOnlyHint: true,
			idempotentHint: true,
		},
		inputSchema,
		outputSchema,
	}, async (toolParams) => {
		log.info(`Retrieving version info for framework '${toolParams.frameworkName}'`);
		const versionInfo = await getVersionInfo(toolParams);
		return {
			content: [{
				type: "text",
				text: JSON.stringify(versionInfo, null, 2),
			}],
			structuredContent: versionInfo,
		};
	});
}
