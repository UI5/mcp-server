import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import type * as getDocumentation from "../../../../src/resources/documentation/getDocumentation.js";
import {InvalidInputError} from "../../../../src/utils.js";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getDocumentationModule: typeof getDocumentation;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
}>;

test.beforeEach(async (t) => {
	const sinon = t.context.sinon = sinonGlobal.createSandbox();

	// Create logger mock
	const loggerMock = {
		silly: sinon.stub(),
		verbose: sinon.stub(),
		perf: sinon.stub(),
		info: sinon.stub(),
		warn: sinon.stub(),
		error: sinon.stub(),
		isLevelEnabled: sinon.stub().returns(true),
	};
	t.context.loggerMock = loggerMock;

	const getDocumentationModule = await esmock(
		"../../../../src/resources/documentation/getDocumentation.js", {
			"@ui5/logger": {
				getLogger: sinon.stub().returns(loggerMock),
				isLogLevelEnabled: sinon.stub().returns(true),
			},
		});

	t.context.getDocumentationModule = getDocumentationModule;
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("Get Best Practices for Developers by LOIO", async (t) => {
	const {getDocumentationByLoio} = t.context.getDocumentationModule;
	const symbol = await getDocumentationByLoio("28fcd55b04654977b63dacbee0552712");
	t.snapshot(symbol);
});

test("Get Best Practices for Developers by URL", async (t) => {
	const {getDocumentationByUrl} = t.context.getDocumentationModule;
	const symbol = await getDocumentationByUrl("https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712");
	t.snapshot(symbol);
});

test("Invalid URL", async (t) => {
	const {getDocumentationByUrl} = t.context.getDocumentationModule;
	await t.throwsAsync(async () => {
		await getDocumentationByUrl("https://other.sap.com/#/topic/28fcd55b04654977b63dacbee0552712");
	}, {instanceOf: InvalidInputError, message: /The provided URL does not point to a topic in the UI5 SDK documentation/});
});
