import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {CallToolResult} from "@modelcontextprotocol/sdk/types.js";
import Context from "./Context.js";
import {handleError} from "./utils.js";

import registerProjectInfoTool from "./tools/get_project_info/index.js";
import registerCreateUi5AppTool from "./tools/create_ui5_app/index.js";
import registerUi5LinterTool from "./tools/run_ui5_linter/index.js";
import registerApiRefTool from "./tools/get_api_reference/index.js";
import registerGetGuidelinesTool from "./tools/get_guidelines/index.js";
import registerGetVersionInfoTool from "./tools/get_version_info/index.js";
import registerGetIntegrationCardsGuidelinesTool from "./tools/get_integration_cards_guidelines/index.js";
import registerCreateIntegrationCardTool from "./tools/create_integration_card/index.js";
import registerGetTypescriptConversionGuidelinesTool from "./tools/get_typescript_conversion_guidelines/index.js";

interface Options {
	useStructuredContentInResponse: boolean;
	useResourcesInResponse: boolean;
}

export type RegisterTool = McpServer["registerTool"];

export default function (server: McpServer, context: Context, options: Options) {
	const registerTool: RegisterTool = (name, config, callback) => {
		if (!options.useStructuredContentInResponse) {
			// If no structured content will be returned, we also must not provide an output schema
			delete config.outputSchema;
		}
		// @ts-expect-error -- Generic type handling
		return server.registerTool(name, config, async (...args) => {
			try {
				// @ts-expect-error -- Generic type handling
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Generic type handling
				const toolResult = callback(...args);
				const response = await Promise.resolve(toolResult);
				return _processResponse(response, options);
			} catch (error) {
				handleError(error);
			}
		});
	};
	// The guidelines tool should be registered first to ensure it is displayed first in MCP clients.
	registerGetGuidelinesTool(registerTool, context);

	registerUi5LinterTool(registerTool, context);

	registerApiRefTool(registerTool, context);

	registerProjectInfoTool(registerTool, context);

	registerCreateUi5AppTool(registerTool, context);

	registerGetVersionInfoTool(registerTool, context);

	registerGetIntegrationCardsGuidelinesTool(registerTool, context);

	registerCreateIntegrationCardTool(registerTool, context);

	registerGetTypescriptConversionGuidelinesTool(registerTool, context);
}

export function _processResponse({content, structuredContent}: CallToolResult, options: Options) {
	if (!options.useResourcesInResponse) {
		content = content.map((item) => {
			if (item.type === "resource") {
				if ("text" in item.resource && typeof item.resource.text === "string") {
					return {
						type: "text" as const,
						text: item.resource.text,
					};
				} else {
					throw new Error(
						`Unable to convert resource without text content to text content: ${JSON.stringify(item)}`
					);
				}
			}
			return item;
		});
	}
	if (structuredContent && options.useStructuredContentInResponse) {
		return {
			structuredContent,
			content,
		};
	}
	return {
		content,
	};
}
