import {readFileSync} from "node:fs";
import Server from "./server.js";

const args = process.argv.slice(2);
const usage = `Usage: ui5mcp

Starts the UI5 MCP server over stdio.

Options:
  -h, --help     Show this help message.
  -v, --version  Show the version.
`;

function getPackageVersion() {
	const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as unknown;
	const hasVersion = typeof packageJson === "object" && packageJson !== null && "version" in packageJson;

	if (hasVersion && typeof packageJson.version === "string") {
		return packageJson.version;
	}

	throw new Error("Unable to determine package version");
}

function handleMetadataFlags() {
	if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
		process.stdout.write(usage);
		process.exit(0);
		return true;
	}

	if (args.length === 1 && ["--version", "-v"].includes(args[0])) {
		process.stdout.write(`${getPackageVersion()}\n`);
		process.exit(0);
		return true;
	}

	return false;
}

if (!handleMetadataFlags()) {
	if (args.length > 0) {
		process.stderr.write("\n");
		process.stderr.write("Unexpected arguments: This command does not accept any arguments.\n");
		process.stderr.write("Usage: ui5mcp\n");
		process.exit(2);
	} else {
		const server = new Server();

		await server.connect();
	}
}
