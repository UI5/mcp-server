/* eslint-disable no-console */
import path from "node:path";
import {readFile, writeFile} from "node:fs/promises";
import {globby} from "globby";
import {fileExists} from "../../src/utils.js";
import {DocumentationIndexEntry} from "../../src/resources/documentation/getDocumentation.js";

export default async function getDocsIndex(
	docsRootPath: string, frameworkVersion: string
): Promise<DocumentationIndexEntry[]> {
	const indexFilePath = path.join(docsRootPath, "mcp-index.json");
	if (!await fileExists(indexFilePath)) {
		await createIndexFile(docsRootPath, indexFilePath, frameworkVersion);
	}
	return JSON.parse(await readFile(indexFilePath, "utf8")) as DocumentationIndexEntry[];
}

export async function createIndexFile(docsRootPath: string, indexFilePath: string, frameworkVersion: string) {
	const index = await createIndex(docsRootPath, frameworkVersion);
	await writeFile(indexFilePath, JSON.stringify(index, null, 2), "utf8");
}

export async function createIndex(docsRootPath: string, frameworkVersion: string): Promise<DocumentationIndexEntry[]> {
	// Create an index of all markdown files inside the docsRootPath directory
	let markdownPaths = await globby(`${docsRootPath}/**/*.md`);
	markdownPaths = markdownPaths.sort((a, b) => {
		return a.localeCompare(b);
	});
	const indexEntries: DocumentationIndexEntry[] = [];
	await Promise.all(markdownPaths.map(async (filePath) => {
		const fileName = path.basename(filePath);

		// Ignore index file
		if (fileName === "index.md") {
			return;
		}

		// Extract the "loio" (Logical Information Object) identifier at the end of the file name
		// e.g. "452ff8c" in "step-11-process-flow-452ff8c.md'
		const shortIdentifier = (/-([a-z0-9]+)\.md$/.exec(fileName))?.[1];
		if (!shortIdentifier) {
			throw new Error(`Could not extract loio identifier from path: ${fileName}`);
		}

		const markdownContent = await readFile(filePath, "utf-8");

		// Extract the title from the first markdown header
		const titleMatch = /^#\s+(.*)$/m.exec(markdownContent);
		let title;
		if (titleMatch) {
			title = titleMatch[1].trim();
		} else {
			// Fallback to extracting the title from the file name
			// e.g. "step 11 process flow" from "step-11-process-flow-452ff8c.md'
			title = fileName.split("-").slice(0, -1).join(" ");
		}

		// Extract the long LOIO identifier from the first comment
		// e.g. "<!-- loio400565b3b81e4fceb2b9aef1679f005b -->"
		const longIdentifierMatch = /<!--\s*loio([a-z0-9]+)\s*-->/i.exec(markdownContent);
		let identifier;
		if (longIdentifierMatch) {
			identifier = longIdentifierMatch[1].trim();
		} else {
			console.log(`Could not extract loio identifier from file: ${fileName}. Skipping...`);
			return;
		}

		const relativeFilePath = path.relative(docsRootPath, filePath);

		indexEntries.push({
			shortIdentifier,
			identifier,
			uri: `https://ui5.sap.com/${frameworkVersion}/topic/${identifier}`,
			title,
			filePath: relativeFilePath,
		});
	}));
	return indexEntries;
}
