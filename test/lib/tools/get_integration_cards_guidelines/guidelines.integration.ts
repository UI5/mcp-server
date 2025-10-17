import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import {getGuidelines} from "../../../../src/tools/get_integration_cards_guidelines/guidelines.js";
import {readFile} from "node:fs/promises";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
}>;

test.beforeEach((t) => {
	t.context.sinon = sinonGlobal.createSandbox();
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("getGuidelines reads correct file", async (t) => {
	const result = await getGuidelines();
	const expectedResult = await readFile(
		new URL("../../../../resources/integration_cards_guidelines.md", import.meta.url), {encoding: "utf-8"}
	);

	t.is(result, expectedResult, "Should return correct guidelines content");
});
