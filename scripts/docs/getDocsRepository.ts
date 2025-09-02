/* eslint-disable no-console */
import {mkdir, rename, rm, unlink} from "node:fs/promises";
import {createWriteStream} from "node:fs";
import {pipeline} from "node:stream/promises";
import path from "node:path";
import yauzl from "yauzl-promise";
import {dirExists} from "../../src/utils.js";
import {downloadFile} from "./downloadHelper.js";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tmpDir = path.join(__dirname, "..", "..", "tmp", "docs");

export default async function getDocsRepository(commitSha: string): Promise<string> {
	// Validate input params since they are used to construct a file path
	if (typeof commitSha !== "string" || !/^[a-f0-9]{40}$/.test(commitSha)) {
		throw new Error(`Invalid commit SHA: ${commitSha}`);
	}
	const dirName = `sapui5-${commitSha}`;
	const targetDir = path.join(tmpDir, dirName);
	if (await dirExists(targetDir)) {
		// Use already downloaded repository
		return targetDir;
	}
	const stagingDir = path.join(tmpDir, "staging", dirName);
	await rm(stagingDir, {recursive: true, force: true});
	try {
		const archiveUrl = `https://github.com/SAP-docs/sapui5/archive/${commitSha}.zip`;
		console.info(`Downloading UI5 documentation archive from "${archiveUrl}" (this might take a moment)...`);
		// Extract directly next to the archive since the archive content
		// is already prefixed with "sapui5-<commitSha>/"
		await fetchRepository(archiveUrl, stagingDir);
		// Check that content was extracted to the expected location
		const extractedDir = path.join(stagingDir, `sapui5-${commitSha}`);
		if (!await dirExists(extractedDir)) {
			throw new Error(`The expected directory "${extractedDir}" does not exist after extraction.`);
		}
		// Ensure that the parent directory exists, but do not create the target directory
		// as this causes an EPERM error in following rename operation on Windows
		await mkdir(path.dirname(targetDir), {recursive: true});
		// Move the extracted content to the target directory
		await rename(extractedDir, targetDir);
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
			if (e.cause && e.cause instanceof Error) {
				console.error(`Cause: ${e.cause.message}`);
			}
		}
		await rm(targetDir, {recursive: true, force: true});
		throw e;
	} finally {
		// Always cleanup staging directory
		await rm(stagingDir, {recursive: true, force: true});
	}
	return targetDir;
}

async function fetchRepository(url: string, targetDir: string) {
	const zipFile = await downloadFile(url, targetDir);

	const zip = await yauzl.open(zipFile);
	try {
		for await (const entry of zip) {
			if (entry.filename.endsWith("/")) {
				await mkdir(path.join(targetDir, entry.filename));
			} else {
				const readEntry = await entry.openReadStream();
				const writeEntry = createWriteStream(path.join(targetDir, entry.filename));
				await pipeline(readEntry, writeEntry);
			}
		}
	} finally {
		await zip.close();
	}

	// Remove the ZIP file, so that the folder will contain the content
	await unlink(zipFile);
}
