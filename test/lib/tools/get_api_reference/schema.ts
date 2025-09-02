import test from "ava";
import {inputSchema} from "../../../../src/tools/get_api_reference/schema.js";

test("query schema validation", (t) => {
	t.true(inputSchema.query.safeParse("sap.ui.Core ").success, "valid query");
	t.true(inputSchema.query.safeParse("sap/ui/Core").success, "valid query with slash");
	t.true(inputSchema.query.safeParse("sap.ui.Core#init").success, "valid query with hash sign");
	t.true(inputSchema.query.safeParse("sap.ui.some-api").success, "valid query with hyphen");

	t.false(inputSchema.query.safeParse("sap.ui'Cores ").success, "invalid query with apostrophe");
	t.false(inputSchema.query.safeParse("sap.ui<>Core").success, "query with greater/smaller-than signs");
	t.false(inputSchema.query.safeParse("sap.ui.getCore()").success, "query with parentheses");
});
