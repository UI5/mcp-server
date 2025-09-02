import {InvalidInputError} from "../../utils.js";
import {SymbolKind} from "./lib/ApiReferenceProvider.js";
import {FormattedSymbol, FormattedSymbolSummary} from "./lib/formatSymbol.js";

const sdkDomain = new Map<string, string>([
	["sapui5", "https://ui5.sap.com"],
	["openui5", "https://openui5.org"],
]);

export default function createUriForSymbol(
	symbol: FormattedSymbol | FormattedSymbolSummary, frameworkName: string, frameworkVersion: string
): string {
	const domain = sdkDomain.get(frameworkName.toLowerCase());
	if (!domain) {
		throw new InvalidInputError(`Unknown framework name: ${frameworkName}`);
	}

	let entityPath;
	if (symbol.module) {
		entityPath = symbol.module.replaceAll("/", ".");
	} else {
		// Some symbols like some namespaces might not have a module (e.g. sap.ui.model.odata)
		entityPath = symbol.name;
	}
	let url = `${domain}/${frameworkVersion}/api/${entityPath}/`;
	if (symbol.export) {
		url += `${symbol.export}/`;
	}
	switch (symbol.kind) {
		case SymbolKind.Constructor:
			url += `constructor`;
			break;
		case SymbolKind.Ui5Aggregation:
			url += `aggregations/${symbol.name}`;
			break;
		case SymbolKind.Ui5Association:
			url += `associations/${symbol.name}`;
			break;
		case SymbolKind.Method:
			url += `methods/${symbol.name}`;
			break;
		case SymbolKind.Function:
			url += `functions/${symbol.name}`;
			break;
		case SymbolKind.Ui5Property:
			url += `controlProperties/${symbol.name}`;
			break;
		case SymbolKind.Ui5Event:
			url += `events/${symbol.name}`;
			break;
	}
	return url;
}
