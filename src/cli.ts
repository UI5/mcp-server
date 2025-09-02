import Server from "./server.js";

if (process.argv.length > 2) {
	process.stderr.write("\n");
	process.stderr.write("Unexpected arguments: This command does not accept any arguments.\n");
	process.stderr.write("Usage: ui5mcp\n");
	process.exit(2);
} else {
	const server = new Server();

	await server.connect();
}
