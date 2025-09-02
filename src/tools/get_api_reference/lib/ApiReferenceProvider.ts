import path from "node:path";
import {ApiReferenceIndex} from "./apiReferenceResources.js";
import {readFile} from "node:fs/promises";
import type {
	ApiJSON,
	ConcreteSymbol,
	ObjMethod,
	ObjProperty,
	Ui5Property,
	ObjEvent,
	Ui5Event,
	EnumProperty,
	Ui5Aggregation,
	Ui5Association,
	Ui5SpecialSetting,
	ObjConstructor,
	ObjCallableParameter,
	NamespaceSymbol,
	SymbolBase,
	InterfaceSymbol,
	ClassSymbol,
	EnumSymbol,
} from "./api-json.js";
import {Mutex} from "async-mutex";
import {Ui5TypeInfo, Ui5TypeInfoKind} from "@ui5/linter/Ui5TypeInfoMatcher";
import {NotFoundError} from "../../../utils.js";
import {formatSymbol, FormattedSymbol, FormattedSymbolSummary, summarizeSymbol} from "./formatSymbol.js";
import {UI5Event} from "@ui5-language-assistant/semantic-model-types";

interface SymbolCache {
	symbols: Map<string, ConcreteSymbol>;
	library: string;
}

interface SymbolInfo {
	symbol: ConcreteSymbol | ConcreteSymbolField;
	library: string;
	moduleName: string | undefined;
}

type AddToUnion<T, U> = T extends unknown ? T & U : never;

export enum SymbolKind {
	// ConcreteSymbol kinds
	Class = "class",
	Interface = "interface",
	Namespace = "namespace",
	Enum = "enum",
	Member = "member", // 'member' is treated like 'namespace' or 'object'
	Object = "object",
	Typedef = "typedef",
	Function = "function",

	// ConcreteSymbolField kinds are added dynamically added here
	Property = "property",
	Constructor = "constructor",
	Method = "method",
	Event = "event",
	Parameter = "parameter",
	EnumProperty = "enum-property",
	Ui5Property = "ui5-property",
	Ui5Event = "ui5-event",
	Ui5Aggregation = "ui5-aggregation",
	Ui5Association = "ui5-association",
	Ui5SpecialSetting = "ui5-specialSetting",
}

export type ConcreteSymbolField = AddToUnion<
	ObjMethod | ObjProperty | Ui5Property | ObjEvent | Ui5Event | EnumProperty |
	Ui5Aggregation | Ui5Association | Ui5SpecialSetting | ObjConstructor | ObjCallableParameter, {
		kind: SymbolKind;
	}>;

const RELEVANT_UI5_TYPE_INFO_TYPES = [
	Ui5TypeInfoKind.Module,
	Ui5TypeInfoKind.Namespace,
	Ui5TypeInfoKind.Class,
	Ui5TypeInfoKind.Constructor,
	Ui5TypeInfoKind.Function,
	Ui5TypeInfoKind.Method,
	Ui5TypeInfoKind.Property,
	Ui5TypeInfoKind.Enum,
	Ui5TypeInfoKind.MetadataAggregation,
	Ui5TypeInfoKind.MetadataAssociation,
	Ui5TypeInfoKind.MetadataEvent,
	Ui5TypeInfoKind.MetadataProperty,
];

export default class ApiReferenceProvider {
	// private formatter: SymbolFormatter;
	private symbolCache = new Map<string, SymbolCache>();
	private apiJsonLoadMutex = new Mutex();

	constructor(private apiJsonsRootDir: string, private index: ApiReferenceIndex) {}

	static async create(apiJsonsRootDir: string) {
		const indexPath = path.join(apiJsonsRootDir, "index.json");
		try {
			const index = await readFile(indexPath, "utf-8");
			const indexParsed = JSON.parse(index) as ApiReferenceIndex;
			return new ApiReferenceProvider(apiJsonsRootDir, indexParsed);
		} catch (err) {
			throw new Error(
				`Failed to read API reference index at ${indexPath}: ${(err as Error).message}`);
		}
	}

	async findSymbol(query: string): Promise<FormattedSymbol | FormattedSymbol[]> {
		const result = await this._findSymbol(query);
		if (Array.isArray(result)) {
			return result.map((s) => {
				return formatSymbol(s.symbol, s.library, s.moduleName);
			});
		}
		return formatSymbol(result.symbol, result.library, result.moduleName);
	}

	async findSymbolAndSummarize(query: string): Promise<
		FormattedSymbol | FormattedSymbolSummary | (FormattedSymbol | FormattedSymbolSummary)[]
	> {
		const result = await this._findSymbol(query);
		if (Array.isArray(result)) {
			return result.map((s) => {
				if (isConcreteSymbol(s.symbol)) {
					// Only concrete symbols can be summarized, others are usually already compact enough
					return summarizeSymbol(s.symbol, s.library, s.moduleName);
				}
				return formatSymbol(s.symbol, s.library, s.moduleName);
			});
		}
		if (isConcreteSymbol(result.symbol)) {
			// Only concrete symbols should be summarized, others are usually already compact enough
			return summarizeSymbol(result.symbol, result.library, result.moduleName);
		}
		return formatSymbol(result.symbol, result.library, result.moduleName);
	}

	async _findSymbol(query: string): Promise<SymbolInfo | SymbolInfo[]> {
		// Index contains normalized module names in the format "<string>.<string>",
		// so we need to normalize the fqn as well
		let searchKey = this._normalizeForIndex(query);
		let indexEntry;
		let entityField;
		while (!indexEntry) {
			indexEntry = this.index[searchKey];
			if (indexEntry) {
				break;
			}
			// Split at last dot and try again
			const lastDotIndex = searchKey.lastIndexOf(".");
			if (lastDotIndex === -1) {
				// No more dots, we cannot split further
				break;
			}
			entityField = searchKey.substring(lastDotIndex + 1);
			searchKey = searchKey.substring(0, lastDotIndex);
		}

		if (!indexEntry) {
			throw new NotFoundError(`Could not find symbol for query '${query}'`);
		}

		const apiJson = await this._getApiJson(indexEntry.filePath);
		const symbol = apiJson.symbols.get(indexEntry.name);
		if (!symbol) {
			// Unexpected internal error. If the symbol is found in the index, it must be in the referenced JSON
			throw new Error(
				`Failed to find indexed symbol '${indexEntry.name}' in API JSON file '${indexEntry.filePath}'`);
		}
		if (symbol.visibility === "private" || symbol.visibility === "restricted") {
			throw new NotFoundError(`Symbol '${symbol.name}' is not public API`);
		}
		if (!entityField) {
			return {
				symbol,
				library: apiJson.library,
				moduleName: symbol.module,
			};
		}
		const fieldSymbol = this._getFieldInSymbol(symbol, entityField);
		if (fieldSymbol) {
			return {
				symbol: fieldSymbol,
				library: apiJson.library,
				moduleName: symbol.module,
			};
		}
		if (symbol.extends) {
			// If not found, try to look in the parent chain
			try {
				return await this._findSymbol(`${symbol.extends}#${entityField}`);
			} catch (_err) {
				// Ignore errors from recursive call and continue the fallback chain below
			}
		}

		const symbols = this._findSymbolsInModule(this._normalizeForModuleName(query), apiJson);
		if (symbols.length) {
			return symbols;
		}

		throw new NotFoundError(
			`Could not find field '${entityField}' in symbol '${symbol.name}' of library '${apiJson.library}'`);
	}

	_findSymbolsInModule(moduleName: string, symbolCache: SymbolCache): SymbolInfo[] {
		// Attempt to search for symbols with a matching module name
		// E.g. when searching for "sap/ui/core/library", there is no dedicated symbol for it.
		// Instead, we will return all symbols contained in that module
		const moduleMatches: SymbolInfo[] = [];
		for (const symbol of symbolCache.symbols.values()) {
			if (symbol.module?.toLowerCase() === moduleName) {
				moduleMatches.push({
					symbol,
					library: symbolCache.library,
					moduleName: moduleName,
				});
			}
		}
		return moduleMatches;
	}

	/**
	 * Searches for a field (e.g. method, property, event) by name within a UI5 symbol.
	 *
	 * @param symbol The ConcreteSymbol to search within.
	 * @param field The name of the field to find.
	 * @returns The found entity (method, property, event, etc.) or undefined if not found.
	 */
	_getFieldInSymbol(
		symbol: ConcreteSymbol,
		field: string
	): ConcreteSymbolField | undefined {
		switch (symbol.kind) {
			case "class": {
				// Check for the constructor separately as it's not in a collection.
				if (field === "constructor" && symbol.constructor) {
					return {
						kind: SymbolKind.Constructor,
						...symbol.constructor,
					};
				}

				// Search through methods, properties, and events directly on the class symbol.
				let found =
					this._findFieldByName(field, symbol.methods, SymbolKind.Method) ??
					this._findFieldByName(field, symbol.properties, SymbolKind.Property) ??
					this._findFieldByName(field, symbol.events, SymbolKind.Event);

				if (found) {
					return found;
				}

				// If not found, search within the 'ui5-metadata' object.
				if (symbol["ui5-metadata"]) {
					const metadata = symbol["ui5-metadata"];
					found =
						this._findFieldByName(field, metadata.properties, SymbolKind.Ui5Property) ??
						this._findFieldByName(field, metadata.aggregations, SymbolKind.Ui5Aggregation) ??
						this._findFieldByName(field, metadata.associations, SymbolKind.Ui5Association) ??
						this._findFieldByName(field, metadata.events, SymbolKind.Ui5Event) ??
						this._findFieldByName(field, metadata.specialSettings, SymbolKind.Ui5SpecialSetting);
				}

				return found;
			}
			case "namespace":
			case "member": // 'member' is treated like 'namespace' or 'object'.
			case "object":
				return (
					this._findFieldByName(field, (symbol as NamespaceSymbol).methods, SymbolKind.Method) ??
					this._findFieldByName(field, (symbol as NamespaceSymbol).properties, SymbolKind.Property) ??
					this._findFieldByName(field, (symbol as NamespaceSymbol).events, SymbolKind.Event)
				);
			case "interface":
				return this._findFieldByName(field, symbol.methods, SymbolKind.Method) ??
					this._findFieldByName(field, symbol.events, SymbolKind.Event);
			case "enum":
				return this._findFieldByName(field, symbol.properties, SymbolKind.EnumProperty);
			case "typedef":
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				return this._findFieldByName(field, symbol.properties, SymbolKind.Property) ??
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					this._findFieldByName(field, symbol.parameters, SymbolKind.Parameter);
			case "function":
				// A function symbol might have parameters to search through.
				return this._findFieldByName(field, symbol.parameters, SymbolKind.Parameter);
			default:
				// Ensure all cases are handled for type safety and provide a fallback.
				return undefined;
		}
	}

	_findFieldByName<T extends {name: string}>(
		fieldName: string, symbolFields: T[] | undefined, fieldKind: SymbolKind
	): ConcreteSymbolField | undefined {
		const match = symbolFields?.find((item) => item.name.toLowerCase() === fieldName);
		if (match) {
			return {
				kind: fieldKind,
				...match,
			};
		}
	};

	async getSymbolForUi5Type(ui5TypeInfo: Ui5TypeInfo): Promise<FormattedSymbol> {
		const symbolInfo = await this._getSymbolForUi5Type(ui5TypeInfo);
		return formatSymbol(symbolInfo.symbol, symbolInfo.library, symbolInfo.moduleName);
	}

	async getSymbolForUi5TypeAndSummarize(ui5TypeInfo: Ui5TypeInfo): Promise<FormattedSymbol | FormattedSymbolSummary> {
		const symbolInfo = await this._getSymbolForUi5Type(ui5TypeInfo);
		if (isConcreteSymbol(symbolInfo.symbol)) {
			// Only concrete symbols should be summarized, others are usually already compact enough
			return summarizeSymbol(symbolInfo.symbol, symbolInfo.library, symbolInfo.moduleName);
		}
		return formatSymbol(symbolInfo.symbol, symbolInfo.library, symbolInfo.moduleName);
	}

	async _getSymbolForUi5Type(ui5TypeInfo: Ui5TypeInfo): Promise<SymbolInfo> {
		const typeInfo = this._parseUi5TypeInfo(ui5TypeInfo);
		if (!typeInfo) {
			throw new Error(`Could not extract module name from Ui5TypeInfo`);
		}
		const {moduleName, relevantNode} = typeInfo;
		const indexEntry = this.index[this._normalizeForIndex(moduleName)];
		if (!indexEntry) {
			throw new Error(`Could not find symbol for module '${moduleName}'`);
		}
		const apiJson = await this._getApiJson(indexEntry.filePath);
		const symbol = apiJson.symbols.get(indexEntry.name);
		if (!symbol) {
			// Unexpected internal error. If the symbol is found in the index, it must be in the referenced JSON
			throw new Error(
				`Failed to find indexed symbol '${indexEntry.name}' in API JSON file '${indexEntry.filePath}'`);
		}

		if (!isUi5ClassSymbol(symbol) && !isUi5NamespaceSymbol(symbol) &&
			!isUi5InterfaceSymbol(symbol) && !isUi5EnumSymbol(symbol)) {
			throw new Error(
				`Expected API reference node to be class, interface or namespace or enum ` +
				`but got ${symbol.kind}`);
		}
		const fieldSymbol = this._findSymbolForSubType(symbol, relevantNode);
		if (!fieldSymbol) {
			throw new Error(
				`Could not find field '${relevantNode.name}' in symbol '${symbol.name}' of library '${apiJson.library}'`
			);
		}
		return {
			symbol: fieldSymbol,
			library: apiJson.library,
			moduleName: indexEntry.name,
		};
	}

	_parseUi5TypeInfo(ui5TypeInfo: Ui5TypeInfo): {moduleName: string; relevantNode: Ui5TypeInfo} | undefined {
		if (ui5TypeInfo.kind === Ui5TypeInfoKind.Module) {
			return {
				moduleName: ui5TypeInfo.name,
				relevantNode: ui5TypeInfo,
			};
		}
		let relevantNode;
		let namespace;
		while ("parent" in ui5TypeInfo && ui5TypeInfo.parent) {
			if (ui5TypeInfo.parent.kind === Ui5TypeInfoKind.Module) {
				relevantNode ??= ui5TypeInfo;
				return {
					moduleName: ui5TypeInfo.parent.name,
					relevantNode,
				};
			} else if (ui5TypeInfo.parent.kind === Ui5TypeInfoKind.Namespace) {
				if (namespace) {
					namespace = `${ui5TypeInfo.parent.name}.${namespace}`;
				} else {
					namespace = ui5TypeInfo.parent.name;
				}
			} else {
				namespace = null;
			}
			if (!relevantNode && RELEVANT_UI5_TYPE_INFO_TYPES.includes(ui5TypeInfo.kind)) {
				relevantNode = ui5TypeInfo;
			}
			ui5TypeInfo = ui5TypeInfo.parent;
		}
		if (ui5TypeInfo.kind === Ui5TypeInfoKind.Namespace) {
			// If the last node is a namespace, we can still return it as a module to cover the "mocked" jQuery types
			return {
				moduleName: namespace ?? ui5TypeInfo.name,
				relevantNode: relevantNode ?? ui5TypeInfo,
			};
		}
		return undefined;
	}

	_findSymbolForSubType(
		symbol: ClassSymbol | InterfaceSymbol | NamespaceSymbol | EnumSymbol,
		ui5TypeInfo: Ui5TypeInfo
	): ConcreteSymbol | ConcreteSymbolField | undefined {
		const fieldToFind = ui5TypeInfo.name.toLowerCase();
		switch (ui5TypeInfo.kind) {
			case Ui5TypeInfoKind.Module:
			case Ui5TypeInfoKind.Namespace:
			case Ui5TypeInfoKind.Class:
				return symbol;
			case Ui5TypeInfoKind.Constructor:
				if (!isUi5ClassSymbol(symbol)) {
					throw new Error(`Expected API reference to be a class, but got ${symbol.kind}`);
				}
				if (!symbol.constructor) {
					return;
				}
				return {
					kind: SymbolKind.Constructor,
					...symbol.constructor,
				};
			case Ui5TypeInfoKind.Function:
			case Ui5TypeInfoKind.Method:
				if (!isUi5ClassSymbol(symbol) && !isUi5NamespaceSymbol(symbol) && !isUi5InterfaceSymbol(symbol)) {
					throw new Error(
						`Expected API reference to be a class, namespace or interface, but got ${symbol.kind}`);
				}
				return this._findFieldByName(fieldToFind, symbol.methods,
					ui5TypeInfo.kind === Ui5TypeInfoKind.Method ? SymbolKind.Method : SymbolKind.Function);
			case Ui5TypeInfoKind.MetadataEvent:
				if (!isUi5ClassSymbol(symbol) && !isUi5NamespaceSymbol(symbol) && !isUi5InterfaceSymbol(symbol)) {
					throw new Error(
						`Expected API reference to be a class, namespace or interface, but got ${symbol.kind}`);
				}
				return this._findFieldByName(fieldToFind, symbol.events as UI5Event[], SymbolKind.Event);
			case Ui5TypeInfoKind.Property:
				if (!isUi5ClassSymbol(symbol) && !isUi5NamespaceSymbol(symbol)) {
					throw new Error(`Expected API reference to be a class or namespace, but got ${symbol.kind}`);
				}
				return this._findFieldByName(fieldToFind, symbol.properties, SymbolKind.Property);
			case Ui5TypeInfoKind.Enum:
				if (!isUi5EnumSymbol(symbol)) {
					throw new Error(`Expected API reference to be an enum, but got ${symbol.kind}`);
				}
				return this._findFieldByName(fieldToFind, symbol.properties, SymbolKind.EnumProperty);
			case Ui5TypeInfoKind.MetadataAggregation:
				if (!isUi5ClassSymbol(symbol)) {
					throw new Error(`Expected API reference to be a class, but got ${symbol.kind}`);
				}
				return this._findFieldByName(
					fieldToFind, symbol["ui5-metadata"]?.aggregations, SymbolKind.Ui5Aggregation);
			case Ui5TypeInfoKind.MetadataAssociation:
				if (!isUi5ClassSymbol(symbol)) {
					throw new Error(`Expected API reference to be a class, but got ${symbol.kind}`);
				}
				return this._findFieldByName(
					fieldToFind, symbol["ui5-metadata"]?.associations, SymbolKind.Ui5Association);
			case Ui5TypeInfoKind.MetadataProperty:
				if (!isUi5ClassSymbol(symbol)) {
					throw new Error(`Expected API reference to be a class, but got ${symbol.kind}`);
				}
				return this._findFieldByName(
					fieldToFind, symbol["ui5-metadata"]?.properties, SymbolKind.Ui5Property);
		}
	}

	async _getApiJson(filePath: string) {
		if (this.symbolCache.has(filePath)) {
			return this.symbolCache.get(filePath)!;
		}

		const release = await this.apiJsonLoadMutex.acquire();
		const apiJsonPath = path.join(this.apiJsonsRootDir, filePath);
		try {
			// Check again inside the mutex whether another thread has already loaded the file
			if (this.symbolCache.has(filePath)) {
				return this.symbolCache.get(filePath)!;
			}

			const apiJsonContent = await readFile(apiJsonPath, "utf-8");
			const apiJsonParsed = JSON.parse(apiJsonContent) as ApiJSON;
			const SymbolCache = {
				symbols: new Map(apiJsonParsed.symbols.map((s) => [s.name, s])),
				library: apiJsonParsed.library,
			};
			this.symbolCache.set(filePath, SymbolCache);
			return SymbolCache;
		} catch (err) {
			throw new Error(
				`Failed to read API JSON file at ${apiJsonPath}: ${(err as Error).message}`);
		} finally {
			release();
		}
	}

	/**
	 * Normalizes the search query by removing white space, replacing slashes and hashes with dots,
	 * and making it lower case (to allow case-insensitive search).
	 *
	 * @param query - The search query to normalize. E.g. " module:sap/ui/core/Component#onInit "
	 * @returns The normalized query. E.g. "sap.ui.core.Component"
	 */
	_normalizeForIndex(query: string) {
		query = query.trim().toLowerCase();
		// Remove any leading "module:" prefix
		if (query.startsWith("module:")) {
			query = query.substring("module:".length);
		}
		// Remove any white space, tabulator and newline characters
		query = query.replace(/\s+/g, "");
		// Replace slashes and hashes with dots
		query = query.replace(/[/#]/g, ".");
		return query;
	}

	_normalizeForModuleName(query: string) {
		query = this._normalizeForIndex(query);
		query = query.replace(/\./g, "/");
		return query;
	}
}

export function isUi5ClassSymbol(symbol: SymbolBase): symbol is ClassSymbol {
	return symbol.kind === "class";
}
export function isUi5InterfaceSymbol(symbol: SymbolBase): symbol is InterfaceSymbol {
	return symbol.kind === "interface";
}
export function isUi5NamespaceSymbol(symbol: SymbolBase): symbol is NamespaceSymbol {
	return symbol.kind === "namespace" || symbol.kind === "member";
}

export function isUi5EnumSymbol(symbol: SymbolBase): symbol is EnumSymbol {
	return symbol.kind === "enum";
}

const CONCRETE_SYMBOL_KINDS: SymbolKind[] = [
	SymbolKind.Class, SymbolKind.Interface, SymbolKind.Namespace, SymbolKind.Enum,
	SymbolKind.Member, SymbolKind.Object, SymbolKind.Typedef, SymbolKind.Function,
];

export function isConcreteSymbol(symbol: ConcreteSymbol | ConcreteSymbolField): symbol is ConcreteSymbol {
	return !!symbol.kind && CONCRETE_SYMBOL_KINDS.includes(symbol.kind as SymbolKind);
}
