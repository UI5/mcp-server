import z from "zod";

export const supportedCardTypes = [
	"Analytical",
	"Calendar",
	"List",
	"Object",
	"Table",
	"Timeline",
] as const;

export type SupportedCardType = typeof supportedCardTypes[number];

export const inputSchema = {
	basePath: z.string()
		.describe("Absolute base path for the creation."),
	cardFolderName: z.string()
		.describe("Name of the folder to create the card in, inside the base path.")
		.default("card"),
	cardType: z.enum(supportedCardTypes)
		.describe("Type of the Integration Card to create.")
		.default("List"),
};
