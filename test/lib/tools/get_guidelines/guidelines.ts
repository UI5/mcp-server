import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";

const fakeGuidelines = "# Guidelines\n\nSome guidelines content.";

async function getMockedModule() {
	const readFileStub = sinonGlobal.stub().resolves(fakeGuidelines);
	const {getGuidelines} = await esmock("../../../../src/tools/get_guidelines/guidelines.ts", {
		"node:fs/promises": {
			readFile: readFileStub,
		},
	});
	return {getGuidelines, readFileStub};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getGuidelines: typeof import("../../../../src/tools/get_guidelines/guidelines.js").getGuidelines;
	readFileStub: sinonGlobal.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	const {getGuidelines, readFileStub} = await getMockedModule();
	t.context.getGuidelines = getGuidelines;
	t.context.readFileStub = readFileStub;
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("getGuidelines returns guidelines content", async (t) => {
	const result = await t.context.getGuidelines();
	t.is(result, fakeGuidelines, "Should return the mocked guidelines content");
	t.true(t.context.readFileStub.calledOnce, "readFile should be called once");
	const callArg = t.context.readFileStub.firstCall.args[0];
	t.true(
		callArg.toString().includes("guidelines.md"),
		"readFile should be called with a path containing 'guidelines.md'"
	);
});
