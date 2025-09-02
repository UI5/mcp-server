import z from "zod";
import {Ui5Framework, Ui5FrameworkSchema} from "../../utils/ui5Framework.js";

export const createAppSchema = {
	appNamespace: z.string()
		.regex(/^[a-z0-9][a-z0-9_.]*$/, {message: `Only alphanumeric characters, underscores and dots are allowed.`})
		.describe("The namespace for the application, e.g. com.myorg.myapp. " +
			"Only lowercase alpha-numeric characters, underscores and dots are allowed."),
	basePath: z.string()
		.describe("Absolute base path for the creation. The application will be created either" +
			" immediately inside this path or in a subdirectory (its name equals the" +
			" application namespace), depending on the 'createAppDirectory' parameter." +
			" This base path must be absolute, not just 'app' or '.' or './something'!"),
	// NOTE: technically, this could be a relative path, but the current directory in MCP context is often
	// not defined well, but is root (/)
	createAppDirectory: z.boolean().optional().default(true)
		.describe("Whether to create a new directory (name equals the application namespace)" +
			" inside the base path. Set this to 'false' when you want to place the 'app' directly" +
			" in the given base path. In SAP CAP applications, typically give the path to the 'app' folder" +
			" as basePath and set this to 'true' to create an application folder. Default: true."),
	framework: Ui5FrameworkSchema.optional().default("SAPUI5")
		.describe("Framework to use (OpenUI5 or SAPUI5), defaults to SAPUI5"),
	frameworkVersion: z.string()
		.regex(/^\d+\.\d+\.\d+$/, {message: "Version must be in format X.Y.Z, e.g. 1.120.0"})
		.optional()
		.describe("Framework version, defaults to latest version. Omit this when in doubt." +
			" When provided, it must be a concrete semantic version, like e.g. 1.136.0. Versions older than 1.96.0" +
			" are not supported."),
	author: z.string()
		.regex(/^[a-zA-Z0-9 .,'@_-]+$/, {message: "Only alphanumeric characters, space, and .,'-@_ are allowed."})
		.optional()
		.describe("Author of the application (auto-detected if not provided)"),
	oDataV4Url: z.string()
		.optional()
		.describe("URL of an OData V4 service, if applicable. This is entirely optional, but without it," +
			" the generated app UI will have no OData Model configured. Setting an URL will configure an" +
			" OData V4 model in the application. Only works for OData V4 services, not for OData V2." +
			" The URL must be either a valid complete URL starting with http:// or https:// or a" +
			" server-root-relative URL like '/odata/v4/serviceName' when the OData service is running on" +
			" the same server. In this case, the prefix 'http://localhost:4004/' will be assumed and used" +
			" by this tool for inquiries about the service. When the port is not 4004, a complete" +
			" 'http://localhost:<port>...' URL must be provided. In the generated application, any" +
			" 'http://localhost:<port>' prefix will be removed. HINT: when the project is a SAP CAP project" +
			" and CAP/CDS tools are available, you **MUST** use them to search for OData services and entities" +
			" and properties **BEFORE** calling this tool. This will help you find the correct service URL."),
	oDataEntitySet: z.string()
		.regex(/^[a-zA-Z0-9_]+$/, {message: "Only alphanumeric characters and underscore are allowed."})
		.optional()
		.describe("Entity set of the OData V4 service to display. Only has an effect when 'oDataV4Url' is set as" +
			" well. This is optional, but setting an entity set is beneficial, as it will configure a basic UI" +
			" in the application which displays the entity set."),
	entityProperties: z.array(z.string().regex(/^[a-zA-Z0-9_]+$/, {message: "Only alphanumeric characters and underscore are allowed."})).optional()
		.describe("Properties of the OData entity set to display. Only has an effect when 'oDataV4Url' and" +
			"'oDataEntitySet' are set. This parameter is optional, but useful to display initial data, when the" +
			" names of existing properties are known. If not provided and the service is active and reachable at" +
			" tool execution time, some random properties will be displayed."),
	initializeGitRepository: z.boolean().optional().default(true)
		.describe("Initialize a local git repository for the application, default is 'true'"),
	runNpmInstall: z.boolean().optional().default(true)
		.describe("Execute npm install after creating the application, default is 'true'"),
	typescript: z.boolean().optional().default(true)
		.describe("Whether to create a TypeScript application (true) or JavaScript application (false)," +
			" default is 'true'. Although the default is preferred, the user MUST know about" +
			" this option before generation, but you should not require an active decision. Also, if an overall" +
			" project already exists, this should influence the language choice to keep things consistent."),
};

export const createAppSchemaObject = z.object(createAppSchema);

/**
 * Parameters for creating a basic UI5 application.
 *
 * @typedef {Object} CreateUi5AppParams
 * @property {string} appNamespace - The namespace for the application, e.g. com.myorg.myapp. Only lowercase
 * 						alpha-numeric characters, underscores and dots are allowed.
 * @property {string} basePath - Absolute base path for the creation. The application will be created either
 * 						immediately inside this path or in a subdirectory (its name equals the
 * 						application namespace) depending on the 'createAppDirectory' parameter.
 * 						This path must be absolute, not just 'app' or '.' or './something'!
 * @property {boolean} [createAppDirectory] - Whether to create a new directory (name equals the application namespace)
 * 						inside the base path. Set this to 'false' when you want to place the application directly
 * 						in the given base path. In SAP CAP applications, typically give the path to the "app" folder
 * 						as basePath and set this to 'true' to create an application folder. Default: true.
 * @property {string} [framework] - The framework to use (OpenUI5 or SAPUI5), defaults to SAPUI5.
 * @property {string} [frameworkVersion] - The framework version to use, e.g. 1.136.0,
 * 						defaults to the latest version.
 * @property {string} [author] - The author of the application (auto-detected if not provided).
 * @property {string} [oDataV4Url] - URL of an OData V4 service, if applicable. This is entirely optional, but without
 * 						it, the generated app UI will have no OData Model configured. Setting an URL will configure an
 *  					OData V4 model in the application. Only works for OData V4 services, not for OData V2.
 * 						The URL must be either a valid complete URL starting with http:// or https:// or a
 * 						server-root-relative URL like '/odata/v4/serviceName' when the OData service is running on
 * 						the same server. In this case, the prefix 'http://localhost:4004/' will be assumed and used
 * 						by this tool for inquiries about the service. When the port is not 4004, a complete
 * 						'http://localhost:<port>...' URL must be provided. In the generated application, any
 * 						'http://localhost:<port>' prefix will be removed.
 * @property {string} [oDataEntitySet] - Entity set of the OData V4 service to display. Only has an effect when
 * 						'oDataV4Url' is set as well. This is optional. Setting an entity set will configure a basic
 * 						UI displaying the entity set in the application.
 * @property {string[]} [entityProperties] - Properties of the OData entity set to display. Only has an effect when
 * 						'oDataV4Url' and 'oDataEntitySet' are set. This parameter is optional, but useful to display
 * 						initial data, when the names of existing properties are known. If not provided and the service
 * 						is active and reachable at tool execution time, some random properties will be displayed.
 * @property {boolean} [runNpmInstall] - Whether to execute npm install after creating the application.
 * 						Default: true.
 * @property {boolean} [initializeGitRepository] - Whether to initialize a local git repository for the application.
 * 						Default: true.
 * @property {boolean} [typescript] - Whether to create a TypeScript application (true) or JavaScript
 * 						application (false). Default: true.
 */
export type CreateUi5AppParams = z.input<typeof createAppSchemaObject>;

/**
 * Result of the createUi5App function.
 *
 * @typedef {Object} CreateUi5AppResult
 * @property {string} message - Basic success/error message only.
 * @property {string} finalLocation - Final location (app root directory) of the created application (if successful).
 * @property {string[]} generatedFiles - Array of generated file paths relative to finalLocation.
 * @property {string} basePath - Absolute base path used for creation.
 * @property {Object} [appInfo] - Structured app information.
 * @property {string} appInfo.appNamespace - The namespace of the application.
 * @property {Ui5Framework} appInfo.framework - The framework used for the application.
 * @property {string} appInfo.frameworkVersion - The version of the framework used.
 * @property {string} [appInfo.finalODataV4Url] - Final OData V4 service URL, if applicable.
 * @property {string} [appInfo.oDataEntitySet] - OData entity set, if applicable.
 * @property {string[]} [appInfo.entityProperties] - Properties of the OData entity set, if applicable.
 * @property {boolean} appInfo.npmInstallExecuted - Whether 'npm install' was executed.
 * @property {boolean} appInfo.gitInitialized - Whether a local git repository was initialized.
 * @property {boolean} appInfo.typescript - Whether the application is a TypeScript application (true) or a JavaScript
 * 	application (false).
 */
export interface CreateUi5AppResult {
	message: string;
	finalLocation: string;
	generatedFiles: string[]; // array of generated file paths relative to finalLocation
	basePath: string;
	appInfo?: { // Structured app information
		appNamespace: string;
		framework: Ui5Framework;
		frameworkVersion: string;
		finalODataV4Url?: string;
		oDataEntitySet?: string;
		entityProperties?: string[];
		npmInstallExecuted: boolean;
		gitInitialized: boolean;
		typescript: boolean;
	};
}
