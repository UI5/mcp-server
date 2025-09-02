// Utility to build the success message for createUi5App
export function createSuccessMessage({
	finalODataV4Url,
	oDataEntitySet,
	entityProperties,
	basePath,
	appNamespace,
	framework,
	frameworkVersion,
	runNpmInstall,
	finalLocation,
	typescript,
	generatedFiles,
}: {
	finalODataV4Url?: string;
	oDataEntitySet?: string;
	entityProperties?: string[];
	basePath: string;
	appNamespace: string;
	framework: string;
	frameworkVersion: string;
	runNpmInstall: boolean;
	finalLocation: string;
	typescript: boolean;
	generatedFiles: string[];
}) {
	const appType = typescript ? "TypeScript" : "JavaScript";

	let uiContent = "";
	if (finalODataV4Url && oDataEntitySet) {
		if (entityProperties && entityProperties.length > 0) {
			uiContent = "The table in the Main view displays the following properties of the entity set " +
				`'${oDataEntitySet}': ${entityProperties.join(", ")}.\n`;
		} else {
			uiContent = "Note that the table in the Main view has no columns and the Form has no fields, " +
				"as an OData service and entity " +
				"was provided, but no properties were specified and none could be found automatically\n";
		}
	} else if (finalODataV4Url /* and no entity */) {
		uiContent = "An OData model was set up, but no UI for displaying data was created, as no " +
			"entity set was specified.\n";
	} else {
		uiContent = "";
	}

	const capContent = basePath.includes("/app/") || basePath.endsWith("/app") ?
	// hints for handling CAP projects
		"Note that in CAP projects you **MUST NOT** use 'npm start' of this UI5 app, as doing this and opening" +
		" it on port 8080 will not allow the app to load any data. Instead, you **MUST** use 'cds watch' in the " +
		" project root to start the server. The new app is then automatically served at" +
		` /${appNamespace}/index.html.\n` :
	// this is for non-CAP cases
		"Note that 'npm start' starts the server and remains active, so you should not wait for the command" +
		" to exit on its own.\nNote that you should not open the root of the server ('/') to launch the app" +
		" when using the UI5 CLI tooling for serving it, but 'index.html'.";

	const message = `Successfully created a ${framework} ${appType} application inside ${finalLocation}
(Namespace: ${appNamespace}
Framework: ${framework} ${frameworkVersion})${runNpmInstall ? " and 'npm install' was executed" : ""}.
Note that the BaseController has no 'onInit' function, so do not try to call 'super.onInit()' in the MainController
when adding code.
${capContent}
${uiContent}
The generated files inside ${finalLocation} are:
${generatedFiles.join("\n")}
`;

	return message;
}
