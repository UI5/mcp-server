import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";
import type createUriForSymbol from "../../../../src/tools/get_api_reference/createUriForSymbol.js";
import {SymbolKind} from "../../../../src/tools/get_api_reference/lib/ApiReferenceProvider.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	createUriForSymbol: typeof createUriForSymbol;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Import the module
	const {default: createUriForSymbol} = await esmock(
		"../../../../src/tools/get_api_reference/createUriForSymbol.js"
	);

	t.context.createUriForSymbol = createUriForSymbol;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test("createUriForSymbol throws error for unknown framework", (t) => {
	const symbol = {
		kind: SymbolKind.Class,
		name: "Button",
		module: "sap/m/Button",
		library: "sap.m",
	};

	// Test with unknown framework
	const error = t.throws(() => {
		t.context.createUriForSymbol(symbol, "UnknownFramework", "1.120.0");
	}, {instanceOf: InvalidInputError});

	t.is(error.message, "Unknown framework name: UnknownFramework");
});

test("createUriForSymbol creates correct URL for SAPUI5 class", (t) => {
	const symbol = {
		kind: SymbolKind.Class,
		name: "Button",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Button/");
});

test("createUriForSymbol creates correct URL for OpenUI5 class", (t) => {
	const symbol = {
		kind: SymbolKind.Class,
		name: "Button",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "OpenUI5", "1.120.0");
	t.is(url, "https://openui5.org/1.120.0/api/sap.m.Button/");
});

test("createUriForSymbol creates correct URL for constructor", (t) => {
	const symbol = {
		kind: SymbolKind.Constructor,
		name: "constructor",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Button/constructor");
});

test("createUriForSymbol creates correct URL for aggregation", (t) => {
	const symbol = {
		kind: SymbolKind.Ui5Aggregation,
		name: "content",
		module: "sap/m/Page",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Page/aggregations/content");
});

test("createUriForSymbol creates correct URL for association", (t) => {
	const symbol = {
		kind: SymbolKind.Ui5Association,
		name: "ariaLabelledBy",
		module: "sap/ui/core/Control",
		library: "sap.ui.core",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.ui.core.Control/associations/ariaLabelledBy");
});

test("createUriForSymbol creates correct URL for method", (t) => {
	const symbol = {
		kind: SymbolKind.Method,
		name: "setText",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Button/methods/setText");
});

test("createUriForSymbol creates correct URL for function", (t) => {
	const symbol = {
		kind: SymbolKind.Function,
		name: "initLibrary",
		module: "sap/ui/core/Core",
		library: "sap.ui.core",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.ui.core.Core/functions/initLibrary");
});

test("createUriForSymbol creates correct URL for property", (t) => {
	const symbol = {
		kind: SymbolKind.Ui5Property,
		name: "text",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Button/controlProperties/text");
});

test("createUriForSymbol creates correct URL for event", (t) => {
	const symbol = {
		kind: SymbolKind.Ui5Event,
		name: "press",
		module: "sap/m/Button",
		library: "sap.m",
	};

	const url = t.context.createUriForSymbol(symbol, "SAPUI5", "1.120.0");
	t.is(url, "https://ui5.sap.com/1.120.0/api/sap.m.Button/events/press");
});
