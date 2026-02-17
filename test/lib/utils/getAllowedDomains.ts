import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../src/utils.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getAllowedDomains: typeof import("../../../src/utils/getAllowedDomains.js").default;
	loggerMock: {
		verbose: sinonGlobal.SinonStub;
	};
	originalEnv: NodeJS.ProcessEnv;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	t.context.originalEnv = {...process.env};

	const loggerMock = {
		verbose: t.context.sinon.stub(),
	};
	t.context.loggerMock = loggerMock;

	const getAllowedDomainsModule = await esmock("../../../src/utils/getAllowedDomains.js", {
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
		},
	});

	t.context.getAllowedDomains = getAllowedDomainsModule.default;
});

test.afterEach.always((t) => {
	process.env = t.context.originalEnv;
	t.context.sinon.restore();
});

test.serial("returns default domains when no environment is set", (t) => {
	const {getAllowedDomains, loggerMock} = t.context;
	delete process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS;
	delete process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS;

	const domains = getAllowedDomains();

	t.deepEqual(domains, ["localhost", "services.odata.org"]);
	t.false(loggerMock.verbose.called);
});

test.serial("returns trimmed domains from UI5_MCP_SERVER_ALLOWED_DOMAINS", (t) => {
	const {getAllowedDomains, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS = " example.com , .api.example.com ,localhost ";

	const domains = getAllowedDomains();

	t.deepEqual(domains, ["example.com", ".api.example.com", "localhost"]);
	t.true(loggerMock.verbose.calledWith(
		"3 allowed domains configured: example.com, .api.example.com, localhost"
	));
});

test.serial("prefers UI5_MCP_SERVER_ALLOWED_DOMAINS over UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS", (t) => {
	const {getAllowedDomains, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS = "primary.example.com";
	process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS = "secondary.example.com";

	const domains = getAllowedDomains();

	t.deepEqual(domains, ["primary.example.com"]);
	t.true(loggerMock.verbose.calledWith("1 allowed domains configured: primary.example.com"));
});

test.serial("returns empty list and logs when env value is blank", (t) => {
	const {getAllowedDomains, loggerMock} = t.context;
	process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS = "   \t  ";

	const domains = getAllowedDomains();

	t.deepEqual(domains, []);
	t.true(loggerMock.verbose.calledWith(
		"Empty value for UI5_MCP_SERVER_ALLOWED_DOMAINS, allowing all domains"
	));
});

test.serial("throws InvalidInputError for malformed domain entries", (t) => {
	const {getAllowedDomains} = t.context;
	process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS = "invalid domain";

	const error = t.throws(() => getAllowedDomains(), {instanceOf: InvalidInputError});
	t.regex(error?.message ?? "", /Invalid domain 'invalid domain' in UI5_MCP_SERVER_ALLOWED_DOMAINS/);
});

test.serial("falls back to UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS when primary is unset", (t) => {
	const {getAllowedDomains, loggerMock} = t.context;
	delete process.env.UI5_MCP_SERVER_ALLOWED_DOMAINS;
	process.env.UI5_MCP_SERVER_ALLOWED_ODATA_DOMAINS = "odata.example.com";

	const domains = getAllowedDomains();

	t.deepEqual(domains, ["odata.example.com"]);
	t.true(loggerMock.verbose.calledWith("1 allowed domains configured: odata.example.com"));
});
