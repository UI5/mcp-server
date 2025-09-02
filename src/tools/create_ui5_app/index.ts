import {createUi5App} from "./create_ui5_app.js";
import {CreateUi5AppParams, createAppSchema} from "./schema.js";
import {createSuccessMessage} from "./createSuccessMessage.js";
import {getLogger} from "@ui5/logger";
import Context from "../../Context.js";
import {RegisterTool} from "../../registerTools.js";

const log = getLogger("tools:create_ui5_app");

export default function registerTool(registerTool: RegisterTool, context: Context) {
	registerTool("create_ui5_app", {
		description: "Create a new basic SAPUI5 application implemented in TypeScript or JavaScript",
		annotations: {
			title: "Create SAPUI5 App",
			readOnlyHint: false,
		},
		inputSchema: createAppSchema,
	}, async (params: CreateUi5AppParams) => {
		log.info(`Creating a new UI5 application at ${params.basePath}`);
		log.info(`   Using framework: ${params.framework}, version: ${params.frameworkVersion}`);
		log.info(`   Namespace: ${params.appNamespace}`);
		log.info(`   OData V4 URL: ${params.oDataV4Url}`);
		log.info(`   OData entity set: ${params.oDataEntitySet}`);
		log.info(`   Create app directory: ${params.createAppDirectory}`);
		log.info(`   Run npm install: ${params.runNpmInstall}`);
		log.info(`   Initialize git repository: ${params.initializeGitRepository}`);
		log.info(`   TypeScript: ${params.typescript}`);
		const resolvedBasePath = await context.normalizePath(params.basePath);
		const result = await createUi5App({
			basePath: resolvedBasePath,
			framework: params.framework,
			frameworkVersion: params.frameworkVersion,
			appNamespace: params.appNamespace,
			oDataV4Url: params.oDataV4Url,
			oDataEntitySet: params.oDataEntitySet,
			createAppDirectory: params.createAppDirectory,
			runNpmInstall: params.runNpmInstall,
			initializeGitRepository: params.initializeGitRepository,
			typescript: params.typescript,
		});
		const message = createSuccessMessage({ // convert the result to a message text
			finalLocation: result.finalLocation,
			generatedFiles: result.generatedFiles,
			basePath: result.basePath,
			finalODataV4Url: result.appInfo?.finalODataV4Url,
			oDataEntitySet: result.appInfo?.oDataEntitySet,
			entityProperties: result.appInfo!.entityProperties,
			appNamespace: result.appInfo!.appNamespace,
			framework: result.appInfo!.framework,
			frameworkVersion: result.appInfo!.frameworkVersion,
			runNpmInstall: result.appInfo!.npmInstallExecuted,
			typescript: result.appInfo!.typescript,
		});
		return {
			content: [{
				type: "text",
				text: message,
			}],
		};
	});
}
