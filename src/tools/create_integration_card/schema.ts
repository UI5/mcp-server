import z from "zod";

export const inputSchema = {
	basePath: z.string()
		.describe("Absolute base path for the creation."),
	cardFolderName: z.string()
		.describe("Name of the folder to create the card in, inside the base path.")
		.default("card"),
	cardType: z.enum(["Analytical", "Calendar", "List", "Object", "Table", "Timeline"])
		.describe("Type of the Integration Card to create.")
		.default("List"),
};

export const createIntegrationCardSchemaObject = z.object(inputSchema);
export type DeclarativeCardTypes = z.infer<typeof inputSchema.cardType>;
