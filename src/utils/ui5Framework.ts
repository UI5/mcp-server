import {z} from "zod";

export const Ui5FrameworkSchema = z.enum(["OpenUI5", "SAPUI5"]);

export type Ui5Framework = z.infer<typeof Ui5FrameworkSchema>;

export function isUi5Framework(value: unknown): value is Ui5Framework {
	return Ui5FrameworkSchema.safeParse(value).success;
}
