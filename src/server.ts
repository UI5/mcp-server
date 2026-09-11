import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";

import Context from "./Context.js";

import {getLogger} from "@ui5/logger";
import {PKG_VERSION} from "./utils.js";
import registerTools from "./registerTools.js";
const log = getLogger("server");

export default class Server {
	private server: McpServer;
	private context: Context;

	constructor() {
		let useStructuredContentInResponse = true;
		if (process.env.UI5_MCP_SERVER_RESPONSE_NO_STRUCTURED_CONTENT) {
			log.info("As per user configuration, responses will not use structured content");
			useStructuredContentInResponse = false;
		}
		let useResourcesInResponse = true;
		if (process.env.UI5_MCP_SERVER_RESPONSE_NO_RESOURCES) {
			log.info("As per user configuration, responses will not use resources");
			useResourcesInResponse = false;
		}
		this.context = new Context();
		this.server = new McpServer({
			name: "UI5",
			version: PKG_VERSION,
		}, {
			capabilities: {
				tools: {},
			},
		});

		registerTools(this.server, this.context, {
			useStructuredContentInResponse,
			useResourcesInResponse,
		});
	}

	async connect(transport: Transport = new StdioServerTransport()) {
		if (this.server.isConnected()) {
			throw new Error("Server is already connected");
		}
		await this.server.connect(transport);
	}

	async close() {
		if (!this.server.isConnected()) {
			throw new Error("Server is not connected");
		}
		await this.server.close();
	}
}
