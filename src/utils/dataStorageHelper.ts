import path from "node:path";
import os from "node:os";
import {getLogger} from "@ui5/logger";
import {mkdir} from "node:fs/promises";
import {promisify} from "node:util";

const log = getLogger("utils:dataStorageHelper");

let baseDir: string | undefined;
let lockDir: string | undefined;
const TOOL_ID = "mcp-server";

export function getDataDir(identifier: string) {
	// Validate identifier (only alphanum, dashes, underscores)
	if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
		throw new Error(
			`Invalid identifier: ${identifier}. Only alphanumeric characters, dashes, and underscores are allowed.`);
	}
	if (!baseDir) {
		baseDir = getBaseDir();
		log.verbose(`Using base directory for data storage: ${baseDir}`);
	}
	return path.join(baseDir, TOOL_ID, identifier);
}

function getBaseDir() {
	if (process.env.UI5_DATA_DIR) {
		return path.resolve(process.env.UI5_DATA_DIR);
	}
	return path.join(os.homedir(), ".ui5");
}

export async function synchronize<T>(lockName: string, callback: () => T) {
	if (!lockDir) {
		lockDir = path.join(getBaseDir(), TOOL_ID, "locks");
		log.verbose(`Using lock directory: ${lockDir}`);
	}
	const lockPath = getLockPath(lockDir, lockName);
	await mkdir(lockDir, {recursive: true});
	log.verbose("Locking " + lockPath);
	const {default: lockfile} = await import("lockfile");
	const lock = promisify(lockfile.lock);
	const unlock = promisify(lockfile.unlock);
	await lock(lockPath, {
		wait: 10000,
		stale: 60000,
		retries: 10,
	});
	try {
		const res = await callback();
		return res;
	} finally {
		log.verbose("Unlocking " + lockPath);
		await unlock(lockPath);
	}
}

// File name must not start with one or multiple dots and should not contain characters other than:
// * alphanumeric
// * Dot, dash, underscore
const illegalFileNameRegExp = /[^0-9a-zA-Z-._/]/;
function sanitizeFileName(fileName: string) {
	if (fileName.startsWith(".") || illegalFileNameRegExp.test(fileName)) {
		throw new Error(`Illegal file name: ${fileName}`);
	}
	return fileName.replace(/\//g, "-");
}

function getLockPath(lockDir: string, lockName: string) {
	return path.join(lockDir, `${sanitizeFileName(lockName)}.lock`);
}
