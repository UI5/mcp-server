import * as z from "zod";
import {inputSchemaObject, outputSchemaObject, versionsSchema} from "./schema.js";

export type VersionInfo = z.infer<typeof versionsSchema>;

export type GetVersionInfoParams = z.infer<typeof inputSchemaObject>;
export type GetVersionInfoResult = z.infer<typeof outputSchemaObject>;
