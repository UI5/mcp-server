import {ConcreteSymbol, Deprecated, Experimental} from "./api-json.js";
import {ConcreteSymbolField, SymbolKind} from "./ApiReferenceProvider.js";

const REMOVE_ATTRIBUTES = [
	"basename",
	"resource",
	"visibility",
];

const SUMMARY_ATTRIBUTES = [
	"kind",
	"name",
	"module",
	"library",
	"export",
	"description",
	"extends",
];

export interface FormattedSymbol {
	// List properties that are guaranteed to be present after formatting
	kind: SymbolKind;
	name: string;
	library: string;
	module?: string;
	export?: string;

	// There will be other properties, depending on the symbol type, which we won't specify in full detail here
	[k: string]: unknown;
}

export interface FormattedSymbolSummary {
	_summaryInfo: string;
	kind: SymbolKind;
	name: string;
	library: string;
	module?: string;
	export?: string;
	description?: string;
	deprecatedText?: string;
	experimentalText?: string;
	extends?: string | string[];
}

export function formatSymbol(
	inputSymbol: ConcreteSymbol | ConcreteSymbolField, libraryName: string, moduleName: string | undefined
): FormattedSymbol {
	const symbol = JSON.parse(JSON.stringify(inputSymbol)) as FormattedSymbol;
	deleteEmptyAttributes(symbol);
	deleteRestricted(symbol);

	removeAttributes(symbol, REMOVE_ATTRIBUTES);
	if (moduleName && !("module" in inputSymbol)) {
		// Do not overwrite existing module names, but add them to symbols that do not have one (like properties)
		// Some symbols like some namespaces might not have a module (e.g. sap.ui.model.odata)
		symbol.module = moduleName;
	}
	symbol.library = libraryName;
	return symbol;
}

export function summarizeSymbol(
	inputSymbol: ConcreteSymbol, libraryName: string, moduleName: string | undefined
): FormattedSymbolSummary {
	const symbol = formatSymbol(inputSymbol, libraryName, moduleName);
	if (symbol.deprecated) {
		symbol.deprecatedText = (symbol.deprecated as Deprecated).text;
	}
	if (symbol.experimental) {
		symbol.experimentalText = (symbol.experimental as Experimental).text;
	}
	keepAttributes(symbol, SUMMARY_ATTRIBUTES);
	symbol._summaryInfo = `Note: This object is a shortened version of the full API object`;
	return symbol as unknown as FormattedSymbolSummary;
}

/* eslint-disable
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-explicit-any,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-argument */
function deleteEmptyAttributes(symbol: FormattedSymbol) {
	for (const key of Object.keys(symbol)) {
		const value = (symbol as any)[key];
		if (value === null || value === undefined || value === "") {
			delete (symbol as any)[key];
		} else if (Array.isArray(value) && value.length === 0) {
			delete (symbol as any)[key];
		} else if (typeof value === "object") {
			deleteEmptyAttributes(value);
			// If the object is now empty, remove it
			if (Object.keys(value).length === 0) {
				delete (symbol as any)[key];
			}
		}
	}
}

/**
 * Recursively delete all object that have a key "visibility" with a value of either "private" or "restricted"
 * Also remove the "visibility" key from all other objects
 */
function deleteRestricted(symbol: FormattedSymbol) {
	for (const [key, value] of Object.entries(symbol)) {
		if (Array.isArray(value)) {
			// If the value is an array, filter out all entries that are private or restricted
			const filtered = value.filter((entry) => {
				if (typeof entry === "object" && entry !== null) {
					return entry.visibility !== "private" && entry.visibility !== "restricted";
				}
				return true;
			});
			// Recursively delete restricted entries in the remaining entries
			for (const entry of filtered) {
				if (typeof entry === "object" && entry !== null) {
					deleteRestricted(entry);
				}
			}
			(symbol as any)[key] = filtered;
		} else if (typeof value === "object" && value !== null && "visibility" in value) {
			if (value.visibility === "private" || value.visibility === "restricted") {
				delete (symbol as any)[key];
			}
		}
	}
}

function removeAttributes(symbol: FormattedSymbol, attrToRemove: string[]) {
	for (const attr of attrToRemove) {
		delete (symbol as any)[attr];
	}
}

function keepAttributes(symbol: FormattedSymbol, attrsToKeep: string[]) {
	for (const key of Object.keys(symbol)) {
		if (!attrsToKeep.includes(key)) {
			delete (symbol as any)[key];
		}
	}
}
/* eslint-enable
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-explicit-any,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-argument */
