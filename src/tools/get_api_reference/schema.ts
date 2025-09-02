import {z} from "zod";

export const inputSchema = {
	projectDir: z.string().describe(
		"The root directory of the UI5 project, containing the 'package.json' and 'ui5.yaml' files. " +
		"This is used to determine the UI5 framework version and libraries used in the project. "
	),
	query: z.string()
		.regex(/^[^<>"'()]+$/, {message: `Characters < > ( ) " ' are not allowed.`})
		.describe(
			"Name of the UI5 module or symbol using either dot or slash notation. " +
			"Examples: 'sap.m.Button', 'sap/ui/core/Core'. Individual symbols can be requested as well, e.g. " +
			"'sap.m.Button#text', 'sap.ui.core.Core#init'"
		),
};

export const inputSchemaObject = z.object(inputSchema);

export type GetApiReferenceParams = z.infer<typeof inputSchemaObject>;
