import path from "path";
import {fileURLToPath} from "url";
import {fileExists, InvalidInputError, NotFoundError} from "../../utils.js";
import {readFile} from "fs/promises";
import {Mutex} from "async-mutex";

export enum AvailableVersions {
	"1.136.7" = "1.136.7",
}
const defaultVersion = AvailableVersions["1.136.7"];

export interface DocumentationResource {
	title: string;
	text: string;
	uri: string;
}

export interface DocumentationIndexEntry {
	shortIdentifier: string;
	identifier: string;
	uri: string;
	title: string;
	filePath: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "..", "..", "resources", "docs");

export async function getDocumentationIndex(
	version: AvailableVersions = defaultVersion
): Promise<DocumentationIndexEntry[]> {
	return await getIndex(version);
}

export async function getDocumentationByLoio(
	loioIdentifier: string,
	version: AvailableVersions = defaultVersion
): Promise<DocumentationResource> {
	const index = await getIndex(version);
	const entry = index.find((e) => e.identifier === loioIdentifier || e.shortIdentifier === loioIdentifier);

	if (!entry) {
		throw new NotFoundError(`Documentation not found for LOIO identifier: ${loioIdentifier}`);
	}

	const filePath = path.join(docsDir, version, entry.filePath);
	if (!await fileExists(filePath)) {
		throw new NotFoundError(`Documentation file not found: ${filePath}`);
	}

	const text = await readFile(filePath, "utf-8");

	return {
		title: entry.title,
		text,
		uri: entry.uri,
	};
}

const TOPIC_URL_REGEX = /https:\/\/ui5.sap.com\/(?:[0-9.]+\/)?(?:#\/)?topic\/([a-zA-Z0-9]+)/i;
export async function getDocumentationByUrl(url: string): Promise<DocumentationResource> {
	// Check it's a topic URL
	const match = TOPIC_URL_REGEX.exec(url);
	if (!match) {
		throw new InvalidInputError(
			`The provided URL does not point to a topic in the UI5 SDK documentation: ${url}. ` +
			`Expected format: https://ui5.sap.com/[<version>/]topic/<loio-identifier>.`);
	}
	// Extract loio identifier from URL
	const identifier = match[1].toLowerCase();

	return await getDocumentationByLoio(identifier);
}

const indexMutex = new Mutex();
const indexCache: Record<string, DocumentationIndexEntry[]> = {};

async function getIndex(version: AvailableVersions): Promise<DocumentationIndexEntry[]> {
	if (indexCache[version]) {
		return indexCache[version];
	}
	const release = await indexMutex.acquire();
	try {
		// Check again inside the mutex
		if (indexCache[version]) {
			return indexCache[version];
		}
		const indexPath = path.join(docsDir, version, "index.json");
		if (!await fileExists(indexPath)) {
			throw new Error(`Documentation index not found for version ${version}: ${indexPath}`);
		}
		const indexContent = await readFile(indexPath, "utf-8");
		const index = JSON.parse(indexContent) as DocumentationIndexEntry[];
		indexCache[version] = index;
		return index;
	} finally {
		release();
	}
}
