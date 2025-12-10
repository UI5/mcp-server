import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {EventEmitter} from "events";

const fakeGuidelines = "# TypeScript Conversion Guidelines\n\nDependencies: {{dependencies}}";
const fakeNpmResponse = {
	"dist-tags": {
		latest: "1.0.0",
	},
};

async function getMockedModule(httpsStub?: sinonGlobal.SinonStub) {
	const readFileStub = sinonGlobal.stub().resolves(fakeGuidelines);

	const mockHttpsStub = httpsStub ?? sinonGlobal.stub().returns({
		on: sinonGlobal.stub().returnsThis(),
	});

	const {getTypescriptConversionGuidelines} = await esmock(
		"../../../../src/tools/get_typescript_conversion_guidelines/typescriptConversionGuidelines.ts",
		{
			"node:fs/promises": {
				readFile: readFileStub,
			},
			"node:https": {
				default: {
					get: mockHttpsStub,
				},
			},
		}
	);
	return {getTypescriptConversionGuidelines, readFileStub, httpsStub: mockHttpsStub};
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getTypescriptConversionGuidelines: typeof import(
		"../../../../src/tools/get_typescript_conversion_guidelines/typescriptConversionGuidelines.js"
	).getTypescriptConversionGuidelines;
	readFileStub: sinonGlobal.SinonStub;
	httpsStub: sinonGlobal.SinonStub;
}>;

test.beforeEach((t) => {
	t.context.sinon = sinonGlobal.createSandbox();
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("getTypescriptConversionGuidelines reads file and replaces dependencies", async (t) => {
	// Create a mock HTTPS response that returns successful npm registry data
	const httpsStub = t.context.sinon.stub();

	const mockResponse = new EventEmitter();
	httpsStub.callsFake((url: string, callback: (res: EventEmitter) => void) => {
		// Simulate async response
		setImmediate(() => {
			callback(mockResponse);
			setImmediate(() => {
				mockResponse.emit("data", JSON.stringify(fakeNpmResponse));
				mockResponse.emit("end");
			});
		});

		return {
			on: t.context.sinon.stub().returnsThis(),
		};
	});

	const {getTypescriptConversionGuidelines, readFileStub} = await getMockedModule(httpsStub);

	const result = await getTypescriptConversionGuidelines();

	// Verify file was read
	t.true(readFileStub.calledOnce);
	const callArg = readFileStub.firstCall.args[0];
	t.true(
		callArg.toString().includes("typescript_conversion_guidelines.md"),
		"readFile should be called with correct file path"
	);

	// Verify dependencies placeholder was replaced
	t.false(result.includes("{{dependencies}}"), "Placeholder should be replaced");
	t.true(result.includes("devDependencies"), "Should contain devDependencies");
	t.true(result.includes("@ui5/cli"), "Should contain @ui5/cli package");
	t.true(result.includes("typescript"), "Should contain typescript package");
	t.true(result.includes("ui5-tooling-transpile"), "Should contain ui5-tooling-transpile package");
});

test("getTypescriptConversionGuidelines handles npm registry errors gracefully", async (t) => {
	// Create a mock HTTPS response that fails
	const httpsStub = t.context.sinon.stub();

	httpsStub.callsFake((_url: string, _callback: (res: EventEmitter) => void) => {
		const mockRequest = new EventEmitter();

		// Simulate error
		setImmediate(() => {
			mockRequest.emit("error", new Error("Network error"));
		});

		return mockRequest;
	});

	const {getTypescriptConversionGuidelines} = await getMockedModule(httpsStub);

	// Should not throw, but fall back to default versions
	const result = await getTypescriptConversionGuidelines();

	t.false(result.includes("{{dependencies}}"), "Placeholder should be replaced even on error");
	t.true(result.includes("devDependencies"), "Should contain devDependencies with fallback versions");
});

test("getTypescriptConversionGuidelines handles malformed npm response", async (t) => {
	// Create a mock HTTPS response with invalid JSON
	const httpsStub = t.context.sinon.stub();

	const mockResponse = new EventEmitter();
	httpsStub.callsFake((_url: string, callback: (res: EventEmitter) => void) => {
		setImmediate(() => {
			callback(mockResponse);
			setImmediate(() => {
				mockResponse.emit("data", "invalid json");
				mockResponse.emit("end");
			});
		});

		return {
			on: t.context.sinon.stub().returnsThis(),
		};
	});

	const {getTypescriptConversionGuidelines} = await getMockedModule(httpsStub);

	// Should not throw, but fall back to default versions
	const result = await getTypescriptConversionGuidelines();

	t.false(result.includes("{{dependencies}}"), "Placeholder should be replaced even with invalid response");
	t.true(result.includes("devDependencies"), "Should contain devDependencies with fallback versions");
});
