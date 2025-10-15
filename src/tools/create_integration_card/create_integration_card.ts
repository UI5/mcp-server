import {mkdir, readFile, writeFile} from "fs/promises";
import {dirExists, InvalidInputError} from "../../utils.js";
import {globby} from "globby";
import path from "path";
import {fileURLToPath} from "url";
import ejs from "ejs";
import {getLogger} from "@ui5/logger";
import {DeclarativeCardTypes} from "./schema.js";

const log = getLogger("tools:create_integration_card:create_integration_card");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createIntegrationCard(folderPath: string, cardType: DeclarativeCardTypes) {
	if (await dirExists(folderPath)) {
		throw new InvalidInputError(
			`The target directory '${folderPath}' already exists. ` +
			"Please choose a different path or remove the existing directory."
		);
	}

	try {
		// if the directory does not exist, create it
		await mkdir(folderPath, {recursive: true});
	} catch (dirError) {
		throw new InvalidInputError(
			`Failed to create directory '${folderPath}': ` +
			`${dirError instanceof Error ? dirError.message : String(dirError) + "\n"} ` +
			"Please ensure the path is valid and as intended and you have write permissions.",
			{cause: dirError}
		);
	}

	const templateDir = path.join(__dirname, "..", "..", "..", "resources", "template-card");
	const filesPatterns = [
		"**",
		"!**/*.ejs",
	];
	const templateFiles = await globby(filesPatterns, {
		cwd: templateDir,
	});
	const generatedFiles = [];

	for (const file of templateFiles) {
		log.verbose(`Processing template file: ${file}`);
		const sourcePath = path.join(templateDir, file);
		const targetPath = path.join(folderPath, file);

		// Ensure target directory exists
		const targetDirPath = path.dirname(targetPath);
		await mkdir(targetDirPath, {recursive: true});

		try {
			// Read and process template
			const templateContent = await readFile(sourcePath, "utf8");
			const templateVars = {
				cardType,
			};
			let processedContent = ejs.render(templateContent, templateVars, {filename: sourcePath});

			// format JSON files
			if (sourcePath.endsWith(".json")) {
				processedContent = JSON.stringify(JSON.parse(processedContent), null, "\t");
			}

			// Write processed file
			log.verbose(`Writing generated file to: ${targetPath}`);
			await writeFile(targetPath, processedContent);
			generatedFiles.push(path.relative(folderPath, targetPath));
		} catch (error) {
			log.error(`Error processing template file '${file}'`);
			throw new Error(
				`Failed to process template file '${file}': ` +
				`${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	return generatedFiles;
};
