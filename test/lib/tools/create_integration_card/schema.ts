import test from "ava";
import {inputSchema} from "../../../../src/tools/create_integration_card/schema.js";

test("'cardType' schema validation (positive)", (t) => {
	[
		"Analytical",
		"Calendar",
		"List",
		"Object",
		"Table",
		"Timeline",
	].forEach((type) => {
		t.true(inputSchema.cardType.safeParse(type).success, `valid card type: ${type}`);
	});
});

test("'cardType' schema validation (negative)", (t) => {
	[
		"Component", // non-declarative
		"WebPage", // non-declarative
		"Adaptive", // non-declarative
		"analytical", // lowercase
		"CALENDAR", // uppercase
		"Cards", // invalid type
		"",
		"123",
		"List ", // trailing space
		" Table", // leading space
		"Objec t", // space in between
	].forEach((type) => {
		t.false(inputSchema.cardType.safeParse(type).success, `invalid card type: ${type}`);
	});
});
