import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import type {
	getApiReferenceSummary,
	getApiReference,
	getApiReferenceForUi5Type,
	getApiReferenceSummaryForUi5Type,
} from "../../../../src/tools/get_api_reference/getApiReference.js";
import {Ui5TypeInfoKind} from "@ui5/linter/Ui5TypeInfoMatcher";
import esmock from "esmock";
import {fileURLToPath} from "url";
import {NotFoundError} from "../../../../src/utils.js";

const API_JSON_FIXTURES_DIR = fileURLToPath(
	new URL("../../../../test/fixtures/api_json_files/openui5-1.120.30", import.meta.url)
);

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getApiReference: typeof getApiReference;
	getApiReferenceSummary: typeof getApiReferenceSummary;
	getApiReferenceForUi5Type: typeof getApiReferenceForUi5Type;
	getApiReferenceSummaryForUi5Type: typeof getApiReferenceSummaryForUi5Type;
}>;

async function getMockedModule() {
	const {
		getApiReference, getApiReferenceForUi5Type, getApiReferenceSummary, getApiReferenceSummaryForUi5Type,
	} = await esmock(
		"../../../../src/tools/get_api_reference/getApiReference.js", {
			"../../../../src/tools/get_api_reference/lib/apiReferenceResources.js": {
				getApiJsonDir: () =>
					Promise.resolve(API_JSON_FIXTURES_DIR),
			},
		}
	);
	return {getApiReference, getApiReferenceForUi5Type, getApiReferenceSummary, getApiReferenceSummaryForUi5Type};
}

const UI5_VERSION = "1.120.30";

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	const {
		getApiReference, getApiReferenceForUi5Type, getApiReferenceSummary, getApiReferenceSummaryForUi5Type,
	} = await getMockedModule();
	t.context.getApiReference = getApiReference;
	t.context.getApiReferenceForUi5Type = getApiReferenceForUi5Type;
	t.context.getApiReferenceSummary = getApiReferenceSummary;
	t.context.getApiReferenceSummaryForUi5Type = getApiReferenceSummaryForUi5Type;
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

const symbolsToTest = [
	"sap.m.Button",
	"sap.m.Button#text",
	"sap.m.Button#busy", // Inherited from control
	"sap.m.Button#constructor",
	"sap.ui.table.Table",
	"sap.ui.table.Table#rows",
	"sap.ui.table.rowmodes.Fixed",
	"sap.m.ButtonType",
	"sap.m.ButtonType.Accept",
	"sap.ui.core.aria.HasPopup",
	"sap.ui.core",
	"jQuery.sap.log",
	"sap.ui.core.mvc.Controller.extend",
	"sap.ui.core.Core#initLibrary",
	"sap.base.assert",
	"module:sap/base/assert",
	"sap/base/Log.addLogListener",
	"sap/base/i18n/ResourceBundle",
	"sap/base/i18n/ResourceBundle#getText",
	"sap/ui/core/library",
	"sap/base/i18n/Formatting.CustomIslamicCalendarData",
	"sap/base/i18n/Formatting.CustomIslamicCalendarData#dateFormat",
	"sap.ui.base.ManagedObject.MetadataOptions.Aggregation#forwarding",
	"module:sap/base/util/array/diff#vConfigOrSymbol",
	"sap.ui.core.format.DateFormat.DateTimeWithTimezone#format",
	"sap.m.NavContainerChild#afterShow",
	"sap.ui.getCore",
];

symbolsToTest.forEach((symbol) => {
	test(`Get ${symbol}`, async (t) => {
		const apiReference = await t.context.getApiReference(symbol, "OpenUI5", UI5_VERSION);
		t.truthy(apiReference);
		t.snapshot(apiReference);
	});
});

symbolsToTest.forEach((symbol) => {
	test(`Summary: Get ${symbol}`, async (t) => {
		const apiReference = await t.context.getApiReferenceSummary(symbol, "OpenUI5", UI5_VERSION);
		t.truthy(apiReference);
		t.snapshot(apiReference);
	});
});

const notFoundSymbolsToTest = {
	"sap/ui/core/does-not-exist":
		"Could not find field 'does-not-exist' in symbol 'sap.ui.core' of library 'sap.ui.core'",
	"sap.ui.core.Control#foo":
		"Could not find field 'foo' in symbol 'sap.ui.core.Control' of library 'sap.ui.core'",
	"Button":
		"Could not find symbol for query 'Button'",
};

Object.entries(notFoundSymbolsToTest).forEach(([symbol, expectedErrorMessage]) => {
	test(`Get ${symbol}`, async (t) => {
		await t.throwsAsync(t.context.getApiReference(symbol, "OpenUI5", UI5_VERSION), {
			instanceOf: NotFoundError,
			message: expectedErrorMessage,
		});
	});
});

Object.entries(notFoundSymbolsToTest).forEach(([symbol, expectedErrorMessage]) => {
	test(`Summary: Get ${symbol}`, async (t) => {
		await t.throwsAsync(t.context.getApiReferenceSummary(symbol, "OpenUI5", UI5_VERSION), {
			instanceOf: NotFoundError,
			message: expectedErrorMessage,
		});
	});
});

test("Get sap.ui.table.rowmodes.Fixed with white spaces and line breaks", async (t) => {
	const symbol = await t.context.getApiReference(` sap.ui.table
.rowmodes  	.Fixed`, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Get sap/ui/core/AbsoluteCSSSize", async (t) => {
	const symbol = await t.context.getApiReference("sap/ui/core/AbsoluteCSSSize", "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Get sap/ui/core", async (t) => {
	const symbol = await t.context.getApiReference("sap/ui/core", "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Get sap/ui/core/date/UniversalDateUtils", async (t) => {
	// API is restricted and should not be returned

	await t.throwsAsync(async () => {
		await t.context.getApiReference("sap/ui/core/date/UniversalDateUtils", "OpenUI5", UI5_VERSION);
	}, {
		message: `Symbol 'module:sap/ui/core/date/UniversalDateUtils' is not public API`,
	}, `Threw with expected error message`);
});

test("Get sap/m/URLHelper", async (t) => {
	// This module is located in the sap/m/library
	const symbol = await t.context.getApiReference("sap/m/URLHelper", "OpenUI5", UI5_VERSION);
	t.is(symbol.length, 1, "Should only return one symbol");
	t.is(symbol[0].module, "sap/m/library", "Module name should be sap.m.library");
	t.snapshot(symbol);
});

test("Get my.app", async (t) => {
	await t.throwsAsync(async () => {
		await t.context.getApiReference("my.app", "OpenUI5", UI5_VERSION);
	}, {
		message: `Could not find symbol for query 'my.app'`,
	}, `Threw with expected error message`);
});

test("Get sap/m/Button#activeIcon property via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceForUi5Type({
		kind: Ui5TypeInfoKind.MetadataProperty,
		name: "activeIcon",
		parent: {
			kind: Ui5TypeInfoKind.ManagedObjectSettings,
			name: "$CustomDataSettings",
			parent: {
				kind: Ui5TypeInfoKind.Module,
				name: "sap/m/Button",
				library: "sap.m",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Get sap/ui/table/Table#footer aggregation via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceForUi5Type({
		kind: Ui5TypeInfoKind.MetadataAggregation,
		name: "footer",
		parent: {
			kind: Ui5TypeInfoKind.ManagedObjectSettings,
			name: "$CustomDataSettings",
			parent: {
				kind: Ui5TypeInfoKind.Module,
				name: "sap/ui/table/Table",
				library: "sap.ui.table",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Get sap.ui.getCore via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceForUi5Type({
		kind: Ui5TypeInfoKind.Function,
		name: "getCore",
		parent: {
			kind: Ui5TypeInfoKind.Namespace,
			name: "ui",
			parent: {
				kind: Ui5TypeInfoKind.Namespace,
				name: "sap",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Summary: Get sap/m/Button#activeIcon property via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceSummaryForUi5Type({
		kind: Ui5TypeInfoKind.MetadataProperty,
		name: "activeIcon",
		parent: {
			kind: Ui5TypeInfoKind.ManagedObjectSettings,
			name: "$CustomDataSettings",
			parent: {
				kind: Ui5TypeInfoKind.Module,
				name: "sap/m/Button",
				library: "sap.m",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Summary: Get sap/ui/table/Table#footer aggregation via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceSummaryForUi5Type({
		kind: Ui5TypeInfoKind.MetadataAggregation,
		name: "footer",
		parent: {
			kind: Ui5TypeInfoKind.ManagedObjectSettings,
			name: "$CustomDataSettings",
			parent: {
				kind: Ui5TypeInfoKind.Module,
				name: "sap/ui/table/Table",
				library: "sap.ui.table",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Summary: Get sap.ui.getCore via Ui5TypeInfo", async (t) => {
	const symbol = await t.context.getApiReferenceSummaryForUi5Type({
		kind: Ui5TypeInfoKind.Function,
		name: "getCore",
		parent: {
			kind: Ui5TypeInfoKind.Namespace,
			name: "ui",
			parent: {
				kind: Ui5TypeInfoKind.Namespace,
				name: "sap",
			},
		},
	}, "OpenUI5", UI5_VERSION);
	t.snapshot(symbol);
});

test("Error handling: getApiReferenceForUi5Type for non-existing module", async (t) => {
	await t.throwsAsync(t.context.getApiReferenceForUi5Type({
		kind: Ui5TypeInfoKind.Module,
		name: "sap/ui/core/does/not/exist",
		library: "sap.ui.core",
	}, "OpenUI5", UI5_VERSION), {
		instanceOf: Error, // TODO: or NotFoundError?
		message: "Could not find symbol for module 'sap/ui/core/does/not/exist'",
	});
});

test("Error handling: getApiReferenceForUi5Type for non-existing global function", async (t) => {
	await t.throwsAsync(t.context.getApiReferenceForUi5Type({
		kind: Ui5TypeInfoKind.Function,
		name: "getDoesNotExist",
		parent: {
			kind: Ui5TypeInfoKind.Namespace,
			name: "ui",
			parent: {
				kind: Ui5TypeInfoKind.Namespace,
				name: "sap",
			},
		},
	}, "OpenUI5", UI5_VERSION), {
		instanceOf: Error,
		message: "Could not find field 'getDoesNotExist' in symbol 'sap.ui' of library 'sap.ui.core'",
	});
});
