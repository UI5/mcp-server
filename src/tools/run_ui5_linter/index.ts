import runUi5Linter from "./runUi5Linter.js";
import {inputSchema, outputSchema} from "./schema.js";
import {TextContent, EmbeddedResource} from "@modelcontextprotocol/sdk/types.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";
import {pathToFileURL} from "node:url";

const log = getLogger("tools:run_ui5_linter");

export default function registerTool(registerTool: RegisterTool, context: Context) {
	registerTool("run_ui5_linter", {
		description:
			"Run UI5 linter on a UI5 project to find and optionally fix UI5 related problems like the usage of " +
			"deprecated API. " +
			"After making changes, you should always run the linter again to verify that no new problems have been " +
			"introduced.",
		annotations: {
			title: "UI5 linter",
			readOnlyHint: false,
		},
		inputSchema,
		outputSchema,
	}, async ({projectDir, filePatterns, provideContextInformation, fix}) => {
		log.info(`Running UI5 linter on project at ${projectDir}`);
		if (filePatterns) {
			log.info(`  File patterns: ${filePatterns.join(", ")}`);
		}
		log.info(`  Fix enabled: ${fix}`);
		log.info(`  Provide context information: ${provideContextInformation}`);
		const resolvedProjectPath = await context.normalizePath(projectDir);
		const results = await runUi5Linter({
			projectDir: resolvedProjectPath,
			filePatterns,
			provideContextInformation,
			fix,
		});
		const content: (TextContent | EmbeddedResource)[] = [{
			type: "text",
			text: JSON.stringify(results.results, null, 2),
		}];
		if (results.contextInformation) {
			const {ruleDescriptions, documentationResources, migrationGuides, apiReferences} =
				results.contextInformation;
			if (apiReferences.length) {
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const projectUri = pathToFileURL(resolvedProjectPath);
				content.push({
					type: "resource",
					resource: {
						uri: `ui5-linter-result://${projectUri.pathname}/api-reference-extract-${timestamp}.json`,
						text: JSON.stringify(apiReferences, null, 2),
						mimeType: "application/json",
					},
				});
			}
			for (const migrationGuide of migrationGuides) {
				content.push({
					type: "resource",
					resource: {
						title: migrationGuide.title,
						text: migrationGuide.text,
						uri: migrationGuide.uri,
						mimeType: "text/markdown",
					},
				});
			};
			for (const doc of documentationResources) {
				content.push({
					type: "resource",
					resource: {
						title: doc.title,
						text: doc.text,
						uri: doc.uri,
						mimeType: "text/markdown",
					},
				});
			}
			if (ruleDescriptions.length) {
				content.push({
					type: "text",
					text: JSON.stringify(ruleDescriptions, null, 2),
				});
			}
		}

		return {
			content,
			structuredContent: results,
		};
	});
}
