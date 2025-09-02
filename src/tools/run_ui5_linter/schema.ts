import {z} from "zod";

export const inputSchema = {
	projectDir: z.string()
		.describe(
			"Root directory of the UI5 project to analyze. Must be an absolute path. Typically this " +
			"the directory where the 'package.json' and 'ui5.yaml' files are located."),
	fix: z.boolean().optional().default(false)
		.describe(
			"Attempt to automatically correct certain findings in the files. " +
			"Only the remaining findings will be returned."),
	filePatterns: z.array(z.string()).optional()
		.describe("File paths or patterns to lint. If not provided, all files in the project will be linted."),
	provideContextInformation: z.boolean().optional().default(true)
		.describe("Whether to include supplementary information in the output. This includes UI5 API reference and " +
			"documentation resources. " +
			"When calling the tool multiple times for the same file or project, refrain from requesting additional " +
			"context every time."),
};

export const inputSchemaObject = z.object(inputSchema);

export const outputSchema = {
	projectDir: z.string(),
	frameworkVersion: z.string().optional().describe("The version of UI5 used in the project"),
	results: z.array(
		z.object({
			filePath: z.string(),
			messages: z.array(
				z.object({
					ruleId: z.string(),
					severity: z.number().describe("2 = error, 1 = warning"),
					line: z.number().optional(),
					column: z.number().optional(),
					fatal: z.boolean().optional(),
					message: z.string(),
					messageDetails: z.string().optional(),
				})
			),
		}).describe(`Linting results for a single file in the project`)
	),
	contextInformation: z.object({
		ruleDescriptions: z.array(z.object({
			ruleId: z.string(),
			description: z.string(),
		})).describe(`Brief descriptions of the rules that were found to be violated in the project`),
		migrationGuides: z.array(z.object({
			title: z.string(),
			text: z.string(),
			uri: z.string(),
		})).describe(
			`For problems the linter can't fix automatically, "fix hint" documents may ` +
			`be provided as guidance for manually resolving them.`),
		apiReferences: z.array(z.any())
			.describe(`Short extracts from the UI5 API reference for the APIs mentioned in the linter report`),
		documentationResources: z.array(z.object({
			title: z.string(),
			text: z.string(),
			uri: z.string(),
		})).describe(
			`Relevant pages in the UI5 documentation that may help to understand the findings ` +
			`and how to resolve them best.`),
	}).optional(),
};
export const outputSchemaObject = z.object(outputSchema);

export type RunUi5LinterParams = z.infer<typeof inputSchemaObject>;
export type RunUi5LinterResult = z.infer<typeof outputSchemaObject>;
export type RunUi5LinterResultContext = z.infer<typeof outputSchema.contextInformation>;
