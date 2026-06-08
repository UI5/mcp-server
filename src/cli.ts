import Server from "./server.js";

function printUsage(): void {
	process.stdout.write("Usage: ui5mcp\n");
	process.stdout.write("\n");
	process.stdout.write("Options:\n");
	process.stdout.write("  -h, --help  Show this help message\n");
}

const args = process.argv.slice(2);

if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
	printUsage();
	process.exit(0);
} else if (args.length > 0) {
	process.stderr.write("\n");
	process.stderr.write("Unexpected arguments: This command does not accept any arguments.\n");
	process.stderr.write("Usage: ui5mcp\n");
	process.exit(2);
} else {
	const server = new Server();

	await server.connect();
}
