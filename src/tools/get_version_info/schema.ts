import {z} from "zod";
import {Ui5FrameworkSchema} from "../../utils/ui5Framework.js";

export const inputSchema = {
	frameworkName: Ui5FrameworkSchema.describe("The UI5 framework to get version information for"),
};
export const inputSchemaObject = z.object(inputSchema);

export const versionsSchema = z.record(
	z.string(),
	z.object({
		version: z.string(),
		support: z.string(),
		lts: z.boolean(),
	})
).describe("All known versions with their support information");

export const outputSchema = {
	versions: versionsSchema,
};
export const outputSchemaObject = z.object(outputSchema);
