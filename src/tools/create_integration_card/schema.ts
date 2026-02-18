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

const destinationSchema = z.object({
	name: z.string()
		.regex(/^[a-zA-Z0-9 .,'@_-]+$/, {message: "Only alphanumeric characters, space, and .,'-@_ are allowed."})
		.describe("Name of the destination."),
	defaultUrl: z.string().describe("Default URL of the destination."),
});

export type Destination = z.infer<typeof destinationSchema>;

export const inputSchema = {
	basePath: z.string()
		.describe("Absolute base path for the creation."),
	cardFolderName: z.string()
		.describe("Name of the folder to create the card in, inside the base path.")
		.default("card"),
	cardType: z.enum(supportedCardTypes)
		.describe("Type of the Integration Card to create.")
		.default("List"),
	destinations: z.array(destinationSchema)
		.describe("List of destinations to be included in the card configuration.")
		.optional(),
};
