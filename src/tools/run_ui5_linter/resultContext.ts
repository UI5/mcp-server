/* eslint-disable max-len */
import {LintResult} from "@ui5/linter";
import {NotFoundError} from "../../utils.js";
import {RunUi5LinterResultContext} from "./schema.js";
import getMigrationGuidesForResults from "./migrationGuides.js";
import {Ui5TypeInfo, Ui5TypeInfoKind} from "@ui5/linter/Ui5TypeInfoMatcher";
import {getApiReferenceSummary, getApiReferenceSummaryForUi5Type} from "../get_api_reference/getApiReference.js";
import {getLogger} from "@ui5/logger";
import {getDocumentationByLoio} from "../../resources/documentation/getDocumentation.js";
import {FormattedSymbol, FormattedSymbolSummary} from "../get_api_reference/lib/formatSymbol.js";
const log = getLogger("tools:run_ui5_linter:resultContext");

const API_REF_FRAMEWORK = "OpenUI5";
const API_REF_VERSION = "1.136.5"; // Version currently used by UI5 linter

export async function createResultContext(results: LintResult[]): Promise<RunUi5LinterResultContext> {
	const {ruleIds, moduleNames, topics, relevantUi5Types} = groupResults(results);
	const ruleDescriptions = getRuleDescriptions(ruleIds, topics);
	const apiReferences = await getApiReferences(relevantUi5Types, topics, moduleNames);
	const migrationGuides = await getMigrationGuidesForResults(results);
	const documentationResources = await getDocumentationReferences(topics);
	return {
		ruleDescriptions,
		apiReferences,
		documentationResources,
		migrationGuides,
	};
}

function groupResults(result: LintResult[]) {
	// Collect rules for errors
	const ruleIds = new Set<string>();
	const moduleNames = new Set<string>();
	const relevantUi5Types = new Set<Ui5TypeInfo>();
	const topics = new Set<string>();
	const uniqueMessageDetails = new Set<string>();
	for (const res of result) {
		res.messages.forEach((message) => {
			ruleIds.add(message.ruleId);
			const ui5TypeInfo = message.ui5TypeInfo;
			if (ui5TypeInfo) {
				const moduleName = getModuleNameForTypeInfo(ui5TypeInfo);
				if (moduleName) {
					moduleNames.add(moduleName);
				}
				relevantUi5Types.add(ui5TypeInfo);
			}
			// Extract anything that remotely looks like a module name from the message details
			if (message.messageDetails) {
				if (uniqueMessageDetails.has(message.messageDetails)) {
					// Already processed this message details, skip and remove from message
					message.messageDetails = "";
				} else {
					uniqueMessageDetails.add(message.messageDetails);

					// Remove line-breaks from message details
					message.messageDetails = message.messageDetails.replace(/\r?\n/g, " ");

					findModuleNames(message.messageDetails, moduleNames);
					findTopicReferences(message.messageDetails, topics);
				}
			}
		});
	}
	return {
		ruleIds,
		moduleNames,
		topics,
		relevantUi5Types,
	};
}

function getModuleNameForTypeInfo(ui5TypeInfo: Ui5TypeInfo): string | undefined {
	if (ui5TypeInfo.kind === Ui5TypeInfoKind.Module) {
		return ui5TypeInfo.name;
	}
	while ("parent" in ui5TypeInfo && ui5TypeInfo.parent) {
		if (ui5TypeInfo.parent.kind === Ui5TypeInfoKind.Module) {
			return ui5TypeInfo.parent.name;
		}
		ui5TypeInfo = ui5TypeInfo.parent;
	}
	return undefined;
}

function getRuleDescriptions(ruleIds: Set<string>, topics: Set<string>) {
	const ruleDescriptions = [];
	for (const ruleId of ruleIds) {
		const ref = RULE_REFERENCES[ruleId];
		let text;
		if (typeof ref === "string") {
			text = ref;
		} else {
			text = ref.text;
			for (const topic of ref.topics) {
				topics.add(topic);
			}
		}
		ruleDescriptions.push({
			ruleId,
			description: text,
		});
	}
	return ruleDescriptions;
}

async function getApiReferences(
	relevantUi5Types: Set<Ui5TypeInfo>, topics: Set<string>, moduleNames: Set<string>
): Promise<(FormattedSymbol | FormattedSymbolSummary)[]> {
	const apiReferences: (FormattedSymbol | FormattedSymbolSummary)[] = [];
	for (const ui5TypeInfo of relevantUi5Types) {
		try {
			// Framework and version must match the version used in UI5 linter
			const apiReference = await getApiReferenceSummaryForUi5Type(ui5TypeInfo, API_REF_FRAMEWORK, API_REF_VERSION);
			findTopicReferences(JSON.stringify(apiReference), topics);
			if (apiReference.deprecatedText && typeof apiReference.deprecatedText === "string") {
				// Examples texts:
				// > Please use {@link sap.ui.core.Element.getElementById Element.getElementById} instead
				// > Use the {@link sap.m.Avatar} instead
				findModuleNames(apiReference.deprecatedText, moduleNames);
			}
			apiReferences.push(apiReference);
		} catch (_err) {
			// Ignore errors, since module might not exist in API reference
			// We only want to provide hints, so it's not a problem if something is missing
			continue;
		}
	}

	// Add short references for all module names
	for (const moduleName of moduleNames) {
		try {
			const res = await getApiReferenceSummary(moduleName, API_REF_FRAMEWORK, API_REF_VERSION);
			if (res) {
				apiReferences.push(...res);
			}
		} catch (_err) {
			// Ignore errors, since module might not exist in API reference
			// We only want to provide hints, so it's not a problem if something is missing
			continue;
		}
	}

	// De-duplicate compact API references
	const uniqueApiReferences = new Map<string, FormattedSymbol | FormattedSymbolSummary>();
	for (const apiReference of apiReferences) {
		const key = `${apiReference.module ?? "<no-module>"}-${apiReference.kind}-${apiReference.name}}`;
		if (!uniqueApiReferences.has(key)) {
			uniqueApiReferences.set(key, apiReference);
		}
	}
	return Array.from(uniqueApiReferences.values());
}

async function getDocumentationReferences(topics: Set<string>) {
	const documentationResources = [];
	for (const topic of topics) {
		try {
			const doc = await getDocumentationByLoio(topic);
			if (doc) {
				documentationResources.push(doc);
			}
		} catch (err) {
			if (err instanceof NotFoundError) {
				log.verbose(
					`Failed to get documentation for topic ${topic}: ${err.message}`);
				// Ignore not-found errors that occur during linter result collection
				// No need to report them to the LLM, since they might be caused by
				// incorrect JSDoc
				continue;
			}
			throw err;
		}
	}
	return documentationResources;
}

// Examples for module names: "sap.m.Avatar", "sap/ui/core/Component", "sap.ui.model.odata.v2.ODataModel"
const MODULE_NAME_REGEX = /sap(?:[./][a-zA-Z0-9_]+)+/g;
function findModuleNames(text: string, moduleNames: Set<string>) {
	// Find all module names in the text
	const matches = text.matchAll(MODULE_NAME_REGEX);
	for (const match of matches) {
		const moduleName = match[0]; // Use the whole match (no group)
		moduleNames.add(moduleName);
	}
}

// Example: https://ui5.sap.com/#/topic/a075ed88ef324261bca41813a6ac4a1c?q=Replacement%20of%20Deprecated%20jQuery%20APIs
const LOIO_ID_URL_REGEX = /https:\/\/ui5\.sap\.com\/#\/topic\/([a-zA-Z0-9-]+)/g;
function findTopicReferences(text: string, topics: Set<string>) {
	const matches = text.matchAll(LOIO_ID_URL_REGEX);
	for (const match of matches) {
		const topic = match[1];
		topics.add(topic);
	}
}

interface RuleReference {
	text: string;
	topics: string[]; // Array of LOIO IDs
}
const RULE_REFERENCES: Record<string, string | RuleReference> = {
	"async-component-flags": {
		text: `Components must be configured for asynchronous loading via the \`sap.ui.core.IAsyncContentCreation\` interface in the Component metadata or via \`async\` flags in the \`manifest.json\``,
		topics: ["676b636446c94eada183b1218a824717", "0187ea5e2eff4166b0453b9dcc8fc64f"],
	},
	"csp-unsafe-inline-script": {
		text: `Inline scripts in HTML files must not be used in accordance with Content Security Policy (CSP) best practices`,
		topics: ["fe1a6dba940e479fb7c3bc753f92b28c"],
	},
	"no-ambiguous-event-handler": {
		text: `Event handlers in XML views/fragments are either defined in the respective controller ` +
			`(in which case they should be prefixed by a dot, e.g. '.<method name>') or refer to a method of an imported module (via \`core:require\` import)`,
		topics: ["b0fb4de7364f4bcbb053a99aa645affe"],
	},
	"no-deprecated-api": {
		text: `Deprecated UI5 API must not be used. Check the individual API reference for details on how to replace it.`,
		topics: ["28fcd55b04654977b63dacbee0552712"],
	},
	"no-deprecated-component": {
		text: `There must be no dependencies to deprecated components in the project's \`manifest.json\``,
		topics: ["a87ca843bcee469f82a9072927a7dcdb"],
	},
	"no-deprecated-control-renderer-declaration": `The control's renderer has not been declared correctly`,
	"no-deprecated-library": {
		text: `The projects \`manifest.json\` and/or \`ui5.yaml\` declare dependencies to deprecated UI5 framework libraries`,
		topics: ["a87ca843bcee469f82a9072927a7dcdb"],
	},
	"no-deprecated-theme": {
		text: `The project is referencing deprecated UI5 themes`,
		topics: ["a87ca843bcee469f82a9072927a7dcdb"],
	},
	"no-globals": {
		text: `Global variables must not be used for accessing UI5 framework APIs and should be avoided in application code. ` +
			`The respective modules should be imported explicitly.`,
		topics: ["28fcd55b04654977b63dacbee0552712"],
	},
	"no-implicit-globals": {
		text: `Either modules are accessed via the deprecated global library namespace that is exposed by the \`<namespace>/library\` module of a UI5 library,
or \`odata\` globals are used implicitly in bindings (missing an explicit import of the corresponding module).`,
		topics: ["28fcd55b04654977b63dacbee0552712"],
	},
	"no-pseudo-modules": {
		text: `Deprecated pseudo modules are used`,
		topics: ["00737d6c1b864dc3ab72ef56611491c4"],
	},
	"parsing-error": `During the linting process a syntax or parsing error occured`,
	"prefer-test-starter": {
		text: `Test-related files should be using the Test Starter concept`,
		topics: ["032be2cb2e1d4115af20862673bedcdb"],
	},
	"ui5-class-declaration": `UI5 classes are not declared correctly. This rule only applies to TypeScript code where built-in ECMAScript classes are used instead of an \`.extend()\` call`,
	"unsupported-api-usage": `UI5 API is not used correctly. For example, a formatter declared in a binding declaration in JavaScript is not of type \`function\``,
};
