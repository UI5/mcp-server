/* eslint-disable no-console */
import {fileURLToPath} from "url";
import Documentation, {DocumentationEntry} from "./docs/Documentation.js";
import getDocsRepository from "./docs/getDocsRepository.js";
import path from "path";
import {dirExists} from "../src/utils.js";
import {mkdir, rm, writeFile} from "fs/promises";

interface DocsRequest {
	revisionSha: string;
	loios: string[];
}

const docs: Record<string, DocsRequest> = {
	"1.136.7": {
		revisionSha: "606268961ecee7b810a1a860bebe0eb7bdc68c23",
		loios: [
			"0187ea5e2eff4166b0453b9dcc8fc64f",
			"00737d6c1b864dc3ab72ef56611491c4",
			"28fcd55b04654977b63dacbee0552712",
			"a87ca843bcee469f82a9072927a7dcdb",
			"676b636446c94eada183b1218a824717",
			"fe1a6dba940e479fb7c3bc753f92b28c",
			"b0fb4de7364f4bcbb053a99aa645affe",
			"032be2cb2e1d4115af20862673bedcdb",
		],
	},
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "resources", "docs");

async function getDocumentation(revisionSha: string, version: string): Promise<Documentation> {
	const repoPath = await getDocsRepository(revisionSha);
	return await Documentation.create(repoPath, version);
}

async function updateDocs(version: string) {
	const docInfo = docs[version];
	if (!docInfo) {
		throw new Error(`No documentation info found for version ${version}`);
	}

	const {revisionSha, loios} = docInfo;
	const documentation = await getDocumentation(revisionSha, version);

	// Ensure loios are unique
	const uniqueLoios = Array.from(new Set(loios));

	const entries: DocumentationEntry[] = await Promise.all(uniqueLoios.map(async (loio) => {
		const entry = await documentation.getDocumentationByLoio(loio);
		console.log(`LOIO: ${loio}, Title: ${entry.title}, URI: ${entry.uri}`);
		return entry;
	}));
	const targetDir = path.join(docsDir, version);
	if (await dirExists(targetDir)) {
		await rm(targetDir, {recursive: true, force: true});
	}
	await mkdir(targetDir, {recursive: true});

	// Create index for productive documentation resources
	const index = await Promise.all(entries.map(async (entry) => {
		const {title, uri, shortIdentifier, identifier, text} = entry;
		const filePath = path.join(targetDir, `${identifier}.md`);
		await writeFile(filePath, text, "utf8");
		return {
			shortIdentifier,
			identifier,
			uri,
			title,
			filePath: path.relative(targetDir, filePath),
		};
	}));

	// Write the index file
	const indexFilePath = path.join(targetDir, "index.json");
	await writeFile(indexFilePath, JSON.stringify(index, null, 2), "utf8");
}

async function main() {
	let versions = process.argv.slice(2);
	if (!versions?.length) {
		console.log("No version specified. Updating all versions.");
		versions = Object.keys(docs);
	}

	for (const version of versions) {
		await updateDocs(version);
		console.log(`Documentation for version ${version} updated successfully.`);
	}
}

try {
	await main();
} catch (err) {
	console.error("Error updating documentation:", err);
	process.exit(1);
}
