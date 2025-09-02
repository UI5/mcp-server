import {z} from "zod";
import {Ui5FrameworkSchema} from "../../utils/ui5Framework.js";

export const inputSchema = {
	projectDir: z.string()
		.describe(
			"Root directory of the UI5 project to analyze. Must be an absolute path. If a path to a file " +
			"is provided, the root directory will be determined automatically."),
};

export const inputSchemaObject = z.object(inputSchema);

export const outputSchema = {
	projectDir: z.string().describe(
		"The root directory of the UI5 project, containing the 'package.json' and 'ui5.yaml' files."),
	projectName: z.string().describe("The name of the project. Note that this may *not* be the namespace"),
	projectType: z.string(),
	frameworkName: Ui5FrameworkSchema.optional()
		.describe("Whether the project uses OpenUI5 or SAPUI5"),
	frameworkVersion: z.string().optional()
		.describe("The version of the framework used in the project"),
	frameworkLibraries: z.array(z.string()).optional()
		.describe("The framework libraries used in the project"),
	versionInfo: z.object({
		supportStatus: z.string(),
		isLts: z.boolean().optional()
			.describe("Whether the framework version is a Long Term Support (LTS) version"),
		latestVersion: z.string(),
		latestLtsVersion: z.string().optional(),
	}).optional(),
};
export const outputSchemaObject = z.object(outputSchema);

export type GetProjectInfoParams = z.infer<typeof inputSchemaObject>;
export type GetProjectInfoResult = z.infer<typeof outputSchemaObject>;
