import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import path from "node:path";
import {fileURLToPath} from "node:url";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
			}
		}
	},
	{
		ignores: ["eslint.config.mjs", "webapp/test/e2e/**"]
	}
);
