// Taken from https://github.com/ui5-community/generator-ui5-ts-app-fcl/blob/main/generators/app/utils.js and adapted
import {URL} from "url";
import {XMLParser} from "fast-xml-parser";
import fetch from "make-fetch-happen";
import {getLogger} from "@ui5/logger";

const log = getLogger("tools:create_ui5_app:ODataMetadata");

// Utility function to ensure a value is always an array
function ensureArray<T>(value: T | T[] | undefined): T[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
}

// Interfaces for metadata structure
interface PropertyRef {
	Name: string;
}

interface Property {
	Name: string;
	Type: string;
}

interface EntityType {
	Name: string;
	Key?: {PropertyRef: PropertyRef | PropertyRef[]};
	Property?: Property | Property[];
}

interface EntitySet {
	Name: string;
	EntityType: string;
}

interface Schema {
	Namespace: string;
	EntityType?: EntityType | EntityType[];
	EntityContainer?: {
		EntitySet?: EntitySet | EntitySet[];
	};
}

interface DataServices {
	Schema: Schema | Schema[];
}

interface Edmx {
	DataServices: DataServices;
}

interface ServiceMetadata {
	Edmx: Edmx;
}

// Main ODataMetadata class
export default class ODataMetadata {
	private serviceMetadata: ServiceMetadata;
	private entityTypes: Record<string, {
		namespace: string;
		name: string;
		keys: string[];
		properties: {name: string; type: string}[];
	}> = {};

	private entitySets: Record<string, {
		namespace: string;
		name: string;
		keys: string[];
		properties: {name: string; type: string}[];
	}> = {};

	private static serviceUrl: URL;

	constructor(serviceMetadata: ServiceMetadata) {
		this.serviceMetadata = serviceMetadata;

		const schemas = ensureArray(this.serviceMetadata.Edmx.DataServices.Schema);

		schemas?.forEach((schema) => {
			ensureArray(schema.EntityType)?.forEach((entityType) => {
				let keys = entityType.Key?.PropertyRef;
				if (keys && !Array.isArray(keys)) {
					keys = [keys];
				}
				this.entityTypes[`${schema.Namespace}.${entityType.Name}`] = {
					namespace: schema.Namespace,
					name: entityType.Name,
					keys: ensureArray(entityType.Key?.PropertyRef)?.map((key) => key.Name) ?? [],
					properties: ensureArray(entityType.Property)?.map((prop) => ({
						name: prop.Name,
						type: prop.Type,
					})) ?? [],
				};
			});
		});

		schemas?.forEach((schema) => {
			ensureArray(schema.EntityContainer?.EntitySet)?.forEach((entitySet) => {
				const entityType = this.entityTypes[entitySet.EntityType];
				if (entityType) {
					this.entitySets[entitySet.Name] = entityType;
				}
			});
		});
	}

	static async load(serviceUrl: string): Promise<ODataMetadata | undefined> {
		try {
			this.serviceUrl = new URL(serviceUrl);
			const url = `${this.serviceUrl.toString()}$metadata`;
			const response = await fetch(url, {signal: AbortSignal.timeout(10000)} as fetch.FetchOptions);
			if (!response.ok) {
				if (response.status === 404) {
					log.info(`The requested resource does not exist: ${url}`);
				} else {
					log.info(`Unexpected response ${response.status}: ${response.statusText} for URL: ${url}`);
				}
				return undefined;
			}
			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "",
				textNodeName: "#text",
				parseAttributeValue: true,
				parseTagValue: true,
				trimValues: true,
				removeNSPrefix: true,
			});
			const serviceMetadata: ServiceMetadata = parser.parse(await response.text()) as ServiceMetadata;
			return new ODataMetadata(serviceMetadata);
		} catch (err: unknown) {
			// Silently ignore metadata loading errors
			// Many services require proxies or authentication, which is out of scope for this tool
			const errorMessage = err instanceof Error ? err.message : String(err);
			log.info(`Failed to load OData metadata from '${serviceUrl}': ` +
				`${errorMessage}`);
		}
	}

	getEntitySets(): string[] {
		return Object.keys(this.entitySets).sort();
	}

	getEntitySet(name: string): {
		namespace: string;
		name: string;
		keys: string[];
		properties: {name: string; type: string}[];
	} | undefined {
		return this.entitySets[name];
	}

	getKeys(entitySet: string): string[] | undefined {
		return this.getEntitySet(entitySet)?.keys;
	}

	getProperties(entitySet: string): string[] | undefined {
		return this.getEntitySet(entitySet)?.properties.map((prop) => prop.name);
	}
}
