import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";

import Context from "./Context.js";
import {ErrorCode, McpError, RootsListChangedNotificationSchema} from "@modelcontextprotocol/sdk/types.js";

import {getLogger} from "@ui5/logger";
import {handleError, PKG_VERSION} from "./utils.js";
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
		// eslint-disable-next-line @typescript-eslint/no-misused-promises -- See comment below
		this.server.server.oninitialized = async () => {
			// oninitialized is typed as not returning a promise, however the current code in the SDK
			// still seems to handle it correctly, therefore we return a promise still and will raise an issue about
			// async initialization handling
			log.verbose("Client initialized");
			try {
				await this.handleServerInitialized();
			} catch (err) {
				handleError(err);
			}
		};
		await this.server.connect(transport);
	}

	async handleServerInitialized() {
		const clientCapabilities = this.server.server.getClientCapabilities();
		if (!clientCapabilities?.roots) {
			log.verbose("Client does not support roots capability");
			return;
		}
		if (clientCapabilities?.roots?.listChanged) {
			// Register handler for future updates to the roots list
			this.server.server.setNotificationHandler(RootsListChangedNotificationSchema, async (notification) => {
				if (notification.method !== "notifications/roots/list_changed") {
					return;
				}
				try {
					await this.updateRoots();
				} catch (err) {
					// We need to handle errors here since the MCP SDK currently seems to just swallow promise
					// rejections in response handlers
					handleError(err);
				}
			});
		} else {
			log.verbose("Client does not support issuing notifications for changed roots");
		}
		// Fetch the initial list of roots
		await this.updateRoots();
	}

	async updateRoots() {
		if (!this.server.isConnected()) {
			throw new Error("Server is not connected");
		}
		try {
			const res = await this.server.server.listRoots();
			log.info(`Received ${res.roots.length} roots from client`);
			log.verbose(`Setting roots in context: ${JSON.stringify(res.roots)}`);
			this.context.setRoots(res.roots);
		} catch (err) {
			if (err instanceof McpError &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				err.code === ErrorCode.MethodNotFound) {
				// This error is produced by listRoots() if the client doesn't handle the request
				// This indicates that it does not support roots, and can be ignored safely
				log.verbose("Client does not implement roots/list request handler");
			} else {
				throw err;
			}
		}
	}

	async close() {
		if (!this.server.isConnected()) {
			throw new Error("Server is not connected");
		}
		await this.server.close();
	}
}
