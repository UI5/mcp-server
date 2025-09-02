import path from "node:path";
import {globby} from "globby";
import ejs from "ejs";
import {mkdir, readFile, writeFile} from "fs/promises";
import {Ui5Framework} from "../../utils/ui5Framework.js";

/**
 * Template variable definitions for EJS templates.
 */
export interface TemplateVars {
	/** Namespace for the application */
	namespace: string;
	/** Framework used, either OpenUI5 or SAPUI5 */
	framework: Ui5Framework;
	/** Version of the framework */
	frameworkVersion: string;
	/** Author of the application */
	author: string;
	/** TypeScript types npm package (only in TS case) */
	tstypes?: string;
	/** Version of TypeScript types npm package (only in TS case) */
	tstypesVersion?: string;
	/** Application ID */
	appId: string;
	/** Application URI (ID with slashes instead of dots) */
	appURI: string;
	/** CDN domain for resources */
	cdnDomain: string;
	/** OData V4 service URL */
	oDataV4Url?: string;
	/** OData entity set name */
	oDataEntitySet?: string;
	/** Properties of the entity to display */
	entityProperties?: string[];
	/** Indicates if server requires X-CSRF token , for optimized model config */
	serverRequiresXCSRF?: boolean;
	/** Default theme for the application */
	defaultTheme: string;
	/** QUnit coverage file - depends on UI5 version */
	qunitCoverageFile: string;
	/** Flags for version-specific features */
	gte1_98_0: boolean;
	gte1_100_0: boolean;
	gte1_104_0: boolean;
	lt1_110_0: boolean;
	gte1_115_0: boolean;
	gte1_120_0: boolean;
	lt1_124_0: boolean;
}

/**
 * Options for processing EJS templates with UI5-specific version handling.
 */
export interface TemplateProcessingOptions {
	/** Directory containing the template files */
	templateDir: string;
	/** Target directory where processed files should be written */
	targetDir: string;
	/** Variables to pass to EJS template rendering */
	templateVars: TemplateVars;
	/** Version-specific logic flags */
	versionSpecificLogic?: {
		lt1_124_0: boolean;
	};
}

/**
 * Processes EJS templates from a source directory to a target directory.
 * Handles UI5-specific version logic for test folder structure.
 *
 * @param options - Configuration for template processing
 * @throws Error if template processing fails
 */
export async function processTemplates(options: TemplateProcessingOptions): Promise<string[]> {
	const {templateDir, targetDir, templateVars, versionSpecificLogic} = options;

	// Paths must be POSIX, as globby always provides POSIX paths, even on Windows
	const webappTestDir = "webapp/test/";
	const webappTestDir_lt1_124 = "webapp/test-lt1_124/";

	// Get all template files
	const templateFiles = await globby("**", {
		cwd: templateDir,
	});
	const generatedFiles = [];

	for (const file of templateFiles) {
		let targetFile = file;

		// Handle version-specific test folder logic
		if (versionSpecificLogic) {
			if (file.startsWith(webappTestDir_lt1_124)) {
				if (versionSpecificLogic.lt1_124_0) {
					targetFile = file.replace(webappTestDir_lt1_124, webappTestDir);
				} else {
					continue; // Skip this file
				}
			} else if (file.startsWith(webappTestDir) && versionSpecificLogic.lt1_124_0) {
				continue; // Skip this file
			}
		}

		const sourcePath = path.join(templateDir, file);
		const targetPath = path.join(targetDir, targetFile.replace(/^_/, "").replace(/\/_/, "/"));

		// Ensure target directory exists
		const targetDirPath = path.dirname(targetPath);
		await mkdir(targetDirPath, {recursive: true});

		try {
			// Read and process template
			const templateContent = await readFile(sourcePath, "utf8");
			const processedContent = ejs.render(templateContent, templateVars);

			// Write processed file
			await writeFile(targetPath, processedContent);
			generatedFiles.push(path.relative(targetDir, targetPath));
		} catch (error) {
			throw new Error(
				`Failed to process template file '${file}': ${error instanceof Error ?
					error.message :
						String(error)}`
			);
		}
	}
	return generatedFiles.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"}));
}
