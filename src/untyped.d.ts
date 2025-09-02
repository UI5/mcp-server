// Note: Do not use import declarations in this file, otherwise the modules are no longer treated
// as ambient (global) but local. Use inline import() instead.

declare module "@ui5/project" {
	type ProjectNamespace = string;
	interface Project {
		getNamespace: () => ProjectNamespace;
		getReader: (options: import("@ui5/fs").ReaderOptions) => import("@ui5/fs").AbstractReader;
		getRootReader: () => import("@ui5/fs").AbstractReader;
		getRootPath: () => string;
		getSourcePath: () => string;
		getName: () => string;
		getType: () => string;
		getFrameworkName: () => "OpenUI5" | "SAPUI5" | undefined;
		getFrameworkVersion: () => string | undefined;
		getFrameworkDependencies: () => {
			name: string;
		}[];
		_testPath: string; // TODO UI5 Tooling: Expose API for optional test path
		_testPathExists: string;
		_isSourceNamespaced: boolean;
	}
	interface ProjectGraph {
		getRoot: () => Project;
	}
	interface DependencyTreeNode {
		id: string;
		version: string;
		path: string;
		configuration?: object | object[];
		configPath?: string;
		dependencies: DependencyTreeNode[];
	}
}

declare module "@ui5/project/ui5Framework/maven/CacheMode" {
	enum CacheMode {
		Default = "Default",
		Force = "Force",
		Off = "Off",
	}
	export default CacheMode;
}

declare module "@ui5/project/graph" {
	interface GraphFromObjectOptions {
		dependencyTree: import("@ui5/project").DependencyTreeNode;
		cwd?: string;
		rootConfiguration?: object;
		rootConfigPath?: string;
		versionOverride?: string;
		cacheMode?: import("@ui5/project/ui5Framework/maven/CacheMode").default;
		resolveFrameworkDependencies?: boolean;
	}
	export function graphFromObject(options: GraphFromObjectOptions): Promise<import("@ui5/project").ProjectGraph>;

	interface GraphFromPackageDependenciesOptions {
		cwd?: string;
		rootConfiguration?: object;
		rootConfigPath?: string;
		versionOverride?: string;
		cacheMode?: import("@ui5/project/ui5Framework/maven/CacheMode").default;
		resolveFrameworkDependencies?: boolean;
		workspaceName?: string;
		workspaceConfiguration?: object;
		workspaceConfigPath?: string;
	}
	export function graphFromPackageDependencies(options?: GraphFromPackageDependenciesOptions):
	Promise<import("@ui5/project").ProjectGraph>;
}

declare module "@ui5/fs" {
	type ResourcePath = string;
	interface ResourceSourceMetadata {
		fsPath: string;
		adapter: string;
		contentModified: boolean;
	}
	interface Resource {
		getBuffer: () => Promise<Buffer>;
		getString: () => Promise<string>;
		getStream: () => import("node:fs").ReadStream;
		getName: () => string;
		getPath: () => ResourcePath;
		getProject: () => import("@ui5/project").Project;
		getSourceMetadata: () => ResourceSourceMetadata;
	}
	type ReaderStyles = "buildtime" | "dist" | "runtime" | "flat";

	interface ReaderOptions {
		style: ReaderStyles;
	}
	interface GlobOptions {
		nodir?: boolean;
	}
	type Filter = (resource: Resource) => boolean;

	export interface AbstractReader {
		byGlob: (virPattern: string | string[], options?: GlobOptions) => Promise<Resource[]>;
		byPath: (path: string) => Promise<Resource | null>;
	}
	export interface AbstractAdapter extends AbstractReader {
		write: (resource: Resource) => Promise<void>;
	}
}

declare module "@ui5/fs/resourceFactory" {
	export function createAdapter(
		parameters: {fsBasePath: string; virBasePath: string}
	): import("@ui5/fs").AbstractAdapter;
	export function createResource(
		parameters: {path: string; string: string; sourceMetadata?: object}
	): import("@ui5/fs").Resource;
	export function createReader(
		parameters: {
			fsBasePath: string;
			virBasePath: string;
			project?: import("@ui5/project").Project;
			excludes?: string[];
			name?: string;
		}
	): import("@ui5/fs").AbstractReader;
	export function createWorkspace(
		parameters: {reader: import("@ui5/fs").AbstractReader}
	): import("@ui5/fs").AbstractAdapter;
	export function createReaderCollection(
		parameters: {
			readers: import("@ui5/fs").AbstractReader[];
			name?: string;
		}
	): import("@ui5/fs").AbstractAdapter;

	export function createFilterReader(
		parameters: {
			reader: import("@ui5/fs").AbstractReader;
			callback: import("@ui5/fs").Filter;
		}
	): import("@ui5/fs").AbstractReader;
}

declare module "@ui5/logger" {
	interface Logger {
		silly: (message: string) => void;
		verbose: (message: string) => void;
		perf: (message: string) => void;
		info: (message: string) => void;
		warn: (message: string) => void;
		error: (message: string) => void;
		isLevelEnabled: (level: string) => boolean;
	}

	export function isLogLevelEnabled(logLevel: string): boolean;
	export function setLogLevel(logLevel: string): void;
	export function getLogLevel(logLevel: string): string;
	export function getLogger(moduleName: string): Logger;
}

declare module "@ui5/logger/writers/Console" {
	export function stop(): void;
	export function init(): void;
}

declare module "fs" {
	export interface Dirent {
		/**
		* The base path that this `fs.Dirent` object refers to.
		* @since v20.12.0
		*/
		parentPath: string;

		/**
		* Alias for `dirent.parentPath`.
		* @since v20.1.0
		* @deprecated Since v20.12.0
		*/
		path: string;
	}
}

declare module "lockfile" {
	export function lock<T>(path: string, options: {
		wait: number;
		stale: number;
		retries: number;
	}, callback: () => T): void;
	export function unlock(path: string, callback: () => void): void;
}
