import {stat, readFile} from "node:fs/promises";
import {getLogger, isLogLevelEnabled} from "@ui5/logger";

const log = getLogger("utils");

async function fsStat(fsPath: string) {
	try {
		return await stat(fsPath);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		// "File or directory does not exist"
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (err.code === "ENOENT") {
			return false;
		} else {
			throw err;
		}
	}
}

export async function dirExists(dirPath: string) {
	const stats = await fsStat(dirPath);
	return stats && stats.isDirectory();
}

export async function fileExists(dirPath: string) {
	const stats = await fsStat(dirPath);
	return stats && stats.isFile();
}

export class InvalidInputError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = this.constructor.name;
	}
}

export class NotFoundError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = this.constructor.name;
	}
}

export function handleError(error: unknown): never {
	if (error instanceof Error) {
		if (error instanceof InvalidInputError || error instanceof NotFoundError) {
			log.verbose(`A processing error occurred and has been forwarded to the client: ${error.message}`);
			if (error.stack) {
				log.verbose(`Stack trace:`);
				log.verbose(error.stack);
			}
			// Forward original error to the client by throwing the exception again
			throw error;
		} else {
			log.error("An internal server error occurred:");
			log.error(error.message);
			if (error.cause && error.cause instanceof Error && isLogLevelEnabled("verbose")) {
				log.error(`Cause: ${error.cause.message}`);
			}
			if (error.stack) {
				log.verbose(`Stack trace:`);
				log.verbose(error.stack);
			}
		}
	} else {
		log.error(String(error));
	}
	/*
	// All other errors should be wrapped in a generic internal server error since
	// a) they might expose possibly sensitive information, which goes against our threat model
	// b) they likely can't be resolved by the AI anyways
	throw new Error(
		`An internal server error occurred within the UI5 MCP server while handling this request. ` +
		`This error can not be corrected by the client. ` +
		`Please check the log output of the UI5 MCP server for more details. ` +
		`These can usually be accessed through the UI of the MCP host application.`
	);
	*/
	// TODO: For now, also forward all other errors to the client.
	throw error;
}

async function readPackageVersion() {
	const pkgUrl = new URL("../package.json", import.meta.url);
	const data = await readFile(pkgUrl, "utf-8");
	const pkg = JSON.parse(data) as {version: string};
	return pkg.version;
}

export const PKG_VERSION = await readPackageVersion();
