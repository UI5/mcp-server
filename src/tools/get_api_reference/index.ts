import {inputSchema} from "./schema.js";
import {getApiReference} from "./getApiReference.js";
import getProjectInfo from "../get_project_info/getProjectInfo.js";
import createUriForSymbol from "./createUriForSymbol.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";
import {FormattedSymbol} from "./lib/formatSymbol.js";
import {EmbeddedResource} from "@modelcontextprotocol/sdk/types.js";

const log = getLogger("tools:get_api_reference");

export default function registerTool(registerTool: RegisterTool, context: Context) {
	registerTool("get_api_reference", {
		description: "Search the UI5 API reference for module names and symbols",
		annotations: {
			title: "UI5 API Reference",
			readOnlyHint: true,
			idempotentHint: true,
		},
		inputSchema,
	}, async ({projectDir, query}) => {
		log.info(`Searching API reference with query '${query}' based on project '${projectDir}'`);
		const resolvedProjectDir = await context.normalizePath(projectDir);
		const projectInfo = await getProjectInfo(resolvedProjectDir);
		const frameworkName = projectInfo.frameworkName ?? "OpenUI5";
		const frameworkVersion =
			projectInfo.frameworkVersion ?? (frameworkName === "OpenUI5" ? "1.136.5" : "1.136.7");
		const apiRef = await getApiReference(query, frameworkName, frameworkVersion);

		return {
			content: apiRef.map((apiRef) => createResource(apiRef, frameworkName, frameworkVersion)),
		};
	});
}

function createResource(apiRef: FormattedSymbol, frameworkName: string, frameworkVersion: string): EmbeddedResource {
	return {
		type: "resource",
		resource: {
			text: JSON.stringify(apiRef, null, 2),
			uri: createUriForSymbol(apiRef, frameworkName, frameworkVersion),
			mimeType: "application/json",
		},
	};
}
