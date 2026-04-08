import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../src/utils.js";
import {Ui5Framework} from "../../../src/utils/ui5Framework.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getBaseUrl: typeof import("../../../src/utils/cdnHelper.js").getBaseUrl;
	fetchCdn: typeof import("../../../src/utils/cdnHelper.js").fetchCdn;
	fetchCdnRaw: typeof import("../../../src/utils/cdnHelper.js").fetchCdnRaw;
	fetchStub: sinonGlobal.SinonStub;
	loggerMock: {
		info: sinonGlobal.SinonStub;
	};
	originalEnv: NodeJS.ProcessEnv;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	t.context.originalEnv = {...process.env};

	// Create a stub for global fetch
	const fetchStub = t.context.sinon.stub();
	t.context.fetchStub = fetchStub;

	const loggerMock = {
		info: t.context.sinon.stub(),
	};
	t.context.loggerMock = loggerMock;

	// Import the module with mocked dependencies
	const {getBaseUrl, fetchCdn, fetchCdnRaw} = await esmock("../../../src/utils/cdnHelper.js", {
		"make-fetch-happen": fetchStub,
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
		},
	});

	t.context.getBaseUrl = getBaseUrl;
	t.context.fetchCdn = fetchCdn;
	t.context.fetchCdnRaw = fetchCdnRaw;
});

test.afterEach.always((t) => {
	process.env = t.context.originalEnv;
	t.context.sinon.restore();
});

test.serial("getBaseUrl returns correct URL for OpenUI5", (t) => {
	const {getBaseUrl} = t.context;
	delete process.env.UI5_MCP_SERVER_CDN_URL;

	const url = getBaseUrl("OpenUI5");
	t.is(url, "https://sdk.openui5.org");
});

test.serial("getBaseUrl returns correct URL for SAPUI5", (t) => {
	const {getBaseUrl} = t.context;
	delete process.env.UI5_MCP_SERVER_CDN_URL;

	const url = getBaseUrl("SAPUI5");
	t.is(url, "https://ui5.sap.com");
});

test.serial("getBaseUrl throws for unknown framework", (t) => {
	const {getBaseUrl} = t.context;
	delete process.env.UI5_MCP_SERVER_CDN_URL;

	const error = t.throws(() => getBaseUrl("unknown-framework" as Ui5Framework));
	t.true(error instanceof InvalidInputError);
	t.is(error.message, "Unknown framework: unknown-framework");
});

test.serial("getBaseUrl appends version when provided", (t) => {
	const {getBaseUrl} = t.context;
	delete process.env.UI5_MCP_SERVER_CDN_URL;

	const url = getBaseUrl("OpenUI5", "1.120.0");
	t.is(url, "https://sdk.openui5.org/1.120.0");
});

test.serial("getBaseUrl uses custom CDN URL for OpenUI5", (t) => {
	const {getBaseUrl, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "https://internal-mirror.corp.com";

	const url = getBaseUrl("OpenUI5");
	t.is(url, "https://internal-mirror.corp.com");
	t.true(loggerMock.info.calledWith(
		"Using custom CDN URL from UI5_MCP_SERVER_CDN_URL: https://internal-mirror.corp.com"
	));
});

test.serial("getBaseUrl uses custom CDN URL for SAPUI5", (t) => {
	const {getBaseUrl, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "https://internal-mirror.corp.com";

	const url = getBaseUrl("SAPUI5");
	t.is(url, "https://internal-mirror.corp.com");
	t.true(loggerMock.info.calledWith(
		"Using custom CDN URL from UI5_MCP_SERVER_CDN_URL: https://internal-mirror.corp.com"
	));
});

test.serial("getBaseUrl appends version to custom CDN URL", (t) => {
	const {getBaseUrl} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "https://internal-mirror.corp.com";

	const url = getBaseUrl("OpenUI5", "1.120.0");
	t.is(url, "https://internal-mirror.corp.com/1.120.0");
});

test.serial("getBaseUrl strips trailing slashes from custom CDN URL", (t) => {
	const {getBaseUrl} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "https://internal-mirror.corp.com///";

	const url = getBaseUrl("OpenUI5");
	t.is(url, "https://internal-mirror.corp.com");
});

test.serial("getBaseUrl throws for invalid custom CDN URL", (t) => {
	const {getBaseUrl} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "not-a-valid-url";

	const error = t.throws(() => getBaseUrl("OpenUI5"));
	t.true(error instanceof InvalidInputError);
	t.regex(error.message, /Invalid URL 'not-a-valid-url' in UI5_MCP_SERVER_CDN_URL/);
});

test.serial("getBaseUrl ignores empty custom CDN URL and uses default", (t) => {
	const {getBaseUrl, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "";

	const url = getBaseUrl("OpenUI5");
	t.is(url, "https://sdk.openui5.org");
	t.false(loggerMock.info.called);
});

test.serial("getBaseUrl trims whitespace from custom CDN URL", (t) => {
	const {getBaseUrl} = t.context;
	process.env.UI5_MCP_SERVER_CDN_URL = "  https://internal-mirror.corp.com  ";

	const url = getBaseUrl("SAPUI5");
	t.is(url, "https://internal-mirror.corp.com");
});

test.serial("fetchCdnRaw returns response on success", async (t) => {
	const {fetchCdnRaw, fetchStub} = t.context;

	// Mock successful response
	const mockResponse = new Response(JSON.stringify({version: "1.120.0"}), {
		status: 200,
		statusText: "OK",
	});
	fetchStub.resolves(mockResponse);

	const response = (await fetchCdnRaw("https://example.com/api")) as unknown as Response;
	t.is(response, mockResponse);
	t.true(fetchStub.calledOnce);
	t.is(fetchStub.firstCall.args[0], "https://example.com/api");
});

test.serial("fetchCdnRaw throws for 404", async (t) => {
	const {fetchCdnRaw, fetchStub} = t.context;

	// Mock 404 response
	const mockResponse = new Response("Not Found", {
		status: 404,
		statusText: "Not Found",
	});
	fetchStub.resolves(mockResponse);

	const url = "https://example.com/not-found";
	await t.throwsAsync(async () => {
		await fetchCdnRaw(url);
	}, {
		instanceOf: Error,
		message:
			`Failed to fetch resource from CDN. Error: ` +
			`The requested resource does not exist for URL: https://example.com/not-found`,
	});
});

test.serial("fetchCdnRaw throws for other HTTP errors", async (t) => {
	const {fetchCdnRaw, fetchStub} = t.context;

	// Mock error response
	const mockResponse = new Response("Server Error", {
		status: 500,
		statusText: "Server Error",
	});
	fetchStub.resolves(mockResponse);

	const url = "https://example.com/error";
	await t.throwsAsync(async () => {
		await fetchCdnRaw(url);
	}, {
		instanceOf: Error,
		message:
			`Failed to fetch resource from CDN. Error: The requested resource returned unexpected status ` +
			`"500 - Server Error" for URL: https://example.com/error`,
	});
});

test.serial("fetchCdnRaw throws for network errors", async (t) => {
	const {fetchCdnRaw, fetchStub} = t.context;

	// Mock network error
	const networkError = new Error("Network error");
	fetchStub.rejects(networkError);

	const url = "https://example.com/network-error";
	await t.throwsAsync(async () => {
		await fetchCdnRaw(url);
	}, {
		instanceOf: Error,
		message: `Failed to fetch resource from CDN. Error: Network error for URL: ${url}`,
	});
});

test.serial("fetchCdn returns parsed JSON on success", async (t) => {
	const {fetchCdn, fetchStub} = t.context;

	// Mock successful response with JSON
	const mockData = {version: "1.120.0", name: "test"};
	const mockResponse = new Response(JSON.stringify(mockData), {
		status: 200,
		statusText: "OK",
		headers: {"Content-Type": "application/json"},
	});
	fetchStub.resolves(mockResponse);

	const result = await fetchCdn("https://example.com/api");
	t.deepEqual(result, mockData);
});

test.serial("fetchCdn propagates errors from fetchCdnRaw", async (t) => {
	const {fetchCdn, fetchStub} = t.context;

	// Mock error response
	const mockResponse = new Response("Not Found", {
		status: 404,
		statusText: "Not Found",
	});
	fetchStub.resolves(mockResponse);

	const url = "https://example.com/not-found";
	await t.throwsAsync(async () => {
		await fetchCdn(url);
	}, {
		instanceOf: Error,
		message: `Failed to fetch resource from CDN. Error: The requested resource does not exist for URL: ${url}`,
	});
});
