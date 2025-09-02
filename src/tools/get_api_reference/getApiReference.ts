import {Ui5TypeInfo} from "@ui5/linter/Ui5TypeInfoMatcher";
import ApiReferenceProvider from "./lib/ApiReferenceProvider.js";
import {getApiJsonDir} from "./lib/apiReferenceResources.js";
import {Ui5Framework} from "../../utils/ui5Framework.js";
import {Mutex} from "async-mutex";
import {FormattedSymbol, FormattedSymbolSummary} from "./lib/formatSymbol.js";

async function createApiReferenceProvider(frameworkName: Ui5Framework, frameworkVersion: string) {
	const apiJsonsRoot = await getApiJsonDir(frameworkName, frameworkVersion);
	const apiRefProvider = await ApiReferenceProvider.create(apiJsonsRoot);
	return apiRefProvider;
}

const apiRefProviders = new Map<string, ApiReferenceProvider>();
const apiRefProviderMutex = new Mutex();
async function getApiRefProvider(frameworkName: Ui5Framework, frameworkVersion: string) {
	const key = `${frameworkName}-${frameworkVersion}`;
	let apiRefProvider = apiRefProviders.get(key);
	if (!apiRefProvider) {
		const release = await apiRefProviderMutex.acquire();
		try {
			// Check again within the mutex
			apiRefProvider = apiRefProviders.get(key);
			if (!apiRefProvider) {
				apiRefProvider = await createApiReferenceProvider(frameworkName, frameworkVersion);
				apiRefProviders.set(key, apiRefProvider);
			}
		} finally {
			release();
		}
	}
	return apiRefProvider;
}

/**
 * Example: await getApiReference("sapui5", 1.120.30", "sap.ui.table.Table");
 */
export async function getApiReference(
	query: string, frameworkName: Ui5Framework, frameworkVersion: string
): Promise<FormattedSymbol[]> {
	const apiRefProvider = await getApiRefProvider(frameworkName, frameworkVersion);
	const res = await apiRefProvider.findSymbol(query);
	return Array.isArray(res) ? res : [res];
}

export async function getApiReferenceSummary(
	query: string, frameworkName: Ui5Framework, frameworkVersion: string
): Promise<(FormattedSymbol | FormattedSymbolSummary)[]> {
	const apiRefProvider = await getApiRefProvider(frameworkName, frameworkVersion);
	const res = await apiRefProvider.findSymbolAndSummarize(query);
	return Array.isArray(res) ? res : [res];
}

export async function getApiReferenceForUi5Type(
	ui5TypeInfo: Ui5TypeInfo, frameworkName: Ui5Framework, frameworkVersion: string
): Promise<FormattedSymbol> {
	const apiRefProvider = await getApiRefProvider(frameworkName, frameworkVersion);
	return await apiRefProvider.getSymbolForUi5Type(ui5TypeInfo);
}

export async function getApiReferenceSummaryForUi5Type(
	ui5TypeInfo: Ui5TypeInfo, frameworkName: Ui5Framework, frameworkVersion: string
): Promise<FormattedSymbol | FormattedSymbolSummary> {
	const apiRefProvider = await getApiRefProvider(frameworkName, frameworkVersion);
	return await apiRefProvider.getSymbolForUi5TypeAndSummarize(ui5TypeInfo);
}
