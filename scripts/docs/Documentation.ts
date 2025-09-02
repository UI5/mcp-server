import {readFile} from "fs/promises";
import path from "path";
import getDocsIndex from "./getDocsIndex.js";
import {DocumentationIndexEntry} from "../../src/resources/documentation/getDocumentation.js";

export interface DocumentationEntry {
	title: string;
	text: string;
	uri: string;
	shortIdentifier: string;
	identifier: string;
}

export default class Documentation {
	private identifierIndex: Map<string, DocumentationIndexEntry>;

	static async create(repoPath: string, frameworkVersion: string): Promise<Documentation> {
		const docsRootPath = path.join(repoPath, "docs");
		const docsIndex = await getDocsIndex(docsRootPath, frameworkVersion);
		return new Documentation(docsRootPath, docsIndex);
	}

	constructor(private docsRootPath: string, docsIndex: DocumentationIndexEntry[]) {
		this.identifierIndex = new Map<string, DocumentationIndexEntry>();
		for (const entry of docsIndex) {
			if (this.identifierIndex.has(entry.identifier)) {
				throw new Error(`Duplicate loio identifier: ${entry.identifier}`);
			}
			this.identifierIndex.set(entry.identifier, entry);
		}
	}

	async getDocumentationByLoio(loioIdentifier: string): Promise<DocumentationEntry> {
		// Search index using first 7 characters of loio identifier (the short identifier)
		// const shortIdentifier = loioIdentifier.substring(0, 7);
		const indexEntry = this.identifierIndex.get(loioIdentifier);
		if (!indexEntry) {
			throw new Error(`Could not find documentation for loio identifier: ${loioIdentifier}`);
		}
		const {title, uri, identifier, shortIdentifier} = indexEntry;
		return {
			title,
			uri,
			identifier,
			shortIdentifier,
			text: await this.readMarkdown(indexEntry.filePath),
		};
	}

	private async readMarkdown(filePath: string) {
		let absoluteFilePath: string;

		if (path.isAbsolute(filePath)) {
			// Paths in mcp-index.json were previously absolute, but have been made relative
			// in order to support testing with fixtures.
			// Existing mcp-index.json files may still contain absolute paths, so we need to handle both cases.
			absoluteFilePath = filePath;
		} else {
			absoluteFilePath = path.join(this.docsRootPath, filePath);
		}

		const markdownContent = await readFile(absoluteFilePath, "utf-8");
		return cleanMarkdown(markdownContent);
	}
}

function cleanMarkdown(content: string) {
	// Remove the first two lines containing the LOIO identifier
	content = content.split("\n").slice(2).join("\n");

	// Remove image links since the images are not provided
	content = content.replace(/!\[.*?\]\(.*?\)/g, "");

	// Remove section anchors
	// e.g. "<a name="loio28fcd55b04654977b63dacbee0552712__section_tst"/>"
	content = content.replace(/<a\s+name="[^"]+"\s*\/>/g, "");

	// Remove more than three consequtive newlines
	content = content.replace(/\n{4,}/g, "\n\n");
	return content.trim();
}
