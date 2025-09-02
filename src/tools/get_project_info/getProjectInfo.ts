import path from "node:path";
import {graphFromObject} from "@ui5/project/graph";
import {dirExists, fileExists, InvalidInputError} from "../../utils.js";
import {GetProjectInfoResult} from "./schema.js";
import {Project, ProjectGraph} from "@ui5/project";
import getVersionInfo from "../get_version_info/getVersionInfo.js";
import semver from "semver";
import {isUi5Framework} from "../../utils/ui5Framework.js";

export default async function getProjectInfo(
	projectDir: string, includeVersionInfo = false
): Promise<GetProjectInfoResult> {
	if (!await dirExists(projectDir)) {
		// If a file path was provided, use the directory of the file
		projectDir = path.dirname(projectDir);
	}
	let graph;
	try {
		// First attempt to crate project with the provided path
		graph = await getProjectGraph(projectDir);
	} catch (initialError) {
		// If that fails, try to search for the correct project root path
		const projectRootDir = await findProjectRoot(projectDir);
		try {
			graph = await getProjectGraph(projectRootDir);
		} catch (_) {
			// If that fails as well, throw the initial error
			throw initialError;
		}
	}

	const project = graph.getRoot();
	const res: GetProjectInfoResult = {
		projectDir: project.getRootPath(),
		projectName: project.getName(),
		projectType: project.getType(),
		frameworkName: project.getFrameworkName(),
		frameworkVersion: project.getFrameworkVersion(),
		frameworkLibraries: project.getFrameworkDependencies().map((lib) => lib.name),
	};
	if (includeVersionInfo) {
		res.versionInfo = await getVersionInfoForProject(project);
	}
	return res;
}

const KNOWN_SRC_DIRS = [
	"webapp", "src",
];

async function findProjectRoot(dir: string): Promise<string> {
	let currentDir = dir;
	let lastDirName: string | undefined;
	while (currentDir !== path.parse(currentDir).root) {
		const ui5YamlPath = path.join(currentDir, "ui5.yaml");
		const packageJsonPath = path.join(currentDir, "package.json");
		if (await fileExists(ui5YamlPath) || await fileExists(packageJsonPath)) {
			return currentDir;
		}
		if (lastDirName && KNOWN_SRC_DIRS.includes(lastDirName)) {
			// If the current directory contains a known source directory,
			// we assume it is the root directory of a UI5 project
			return currentDir;
		}
		lastDirName = path.basename(currentDir);
		currentDir = path.dirname(currentDir);
	}
	throw new InvalidInputError(`Unable to locate a UI5 project in directory ${dir} or any of its parents`);
}

async function getProjectGraph(rootDir: string): Promise<ProjectGraph> {
	let rootConfigPath, rootConfiguration;

	// Prefer ui5-local.yaml over ui5.yaml since that is usually where a framework version is configured
	const ui5YamlPaths = ["ui5-local.yaml", "ui5.yaml"];

	// Check if ui5.yaml or ui5-local.yaml exists in the root directory
	for (const yamlPath of ui5YamlPaths) {
		const fullPath = path.join(rootDir, yamlPath);
		if (await fileExists(fullPath)) {
			rootConfigPath = fullPath;
			break;
		}
	}

	if (!rootConfigPath) {
		// Could not find a ui5.yaml file
		// => Attempt to create a "virtual" project depending on the directory structure
		const dirChecks = await Promise.all([
			dirExists(path.join(rootDir, "webapp")),
			dirExists(path.join(rootDir, "src", "main", "webapp")),
			dirExists(path.join(rootDir, "src", "main", "jslib")),
			dirExists(path.join(rootDir, "src", "main", "js")),
			dirExists(path.join(rootDir, "src", "main", "uilib")),
			dirExists(path.join(rootDir, "src")),
			dirExists(path.join(rootDir, "WebContent")),
		]);

		if (dirChecks[0]) {
			// Common app with webapp folder
			rootConfiguration = createProjectConfig("application", "webapp");
		} else if (dirChecks[1]) {
			// Legacy app with src/main/webapp folder
			rootConfiguration = createProjectConfig("application", "src/main/webapp");
		} else if (dirChecks[2]) {
			// Library with src/main/jslib folder
			rootConfiguration = createProjectConfig("library", "src/main/jslib", "src/test/jslib");
		} else if (dirChecks[3]) {
			// Library with src/main/js folder
			rootConfiguration = createProjectConfig("library", "src/main/js", "src/test/js");
		} else if (dirChecks[4]) {
			// Library with src/main/uilib folder
			rootConfiguration = createProjectConfig("library", "src/main/uilib", "src/test/uilib");
		} else if (dirChecks[5]) {
			// Library with src folder
			rootConfiguration = createProjectConfig("library", "src", "test");
		} else if (dirChecks[6]) {
			// Legacy app with WebContent folder
			rootConfiguration = createProjectConfig("application", "WebContent");
		}
	}

	if (!rootConfigPath && !rootConfiguration) {
		throw new InvalidInputError(
			`Unable to find a UI5 project at ${rootDir}. ` +
			`Make sure the provided path is correct and contains a valid UI5 project`
		);
	}

	try {
		return await graphFromObject({
			dependencyTree: {
				id: "ui5-project",
				version: "1.0.0",
				path: rootDir,
				dependencies: [],
			},
			rootConfigPath,
			rootConfiguration,
			resolveFrameworkDependencies: false,
		});
	} catch (err) {
		throw new InvalidInputError(
			`Unable to use the UI5 project located at ${rootDir}. ` +
			`Make sure the provided path is correct and contains a valid UI5 project. ` +
			`Error: ${err instanceof Error ? err.message : String(err)}`,
			{cause: err});
	}
}

interface ProjectConfig {
	specVersion: string;
	type: string;
	metadata: {
		name: string;
	};
	resources?: {
		configuration: {
			paths: {
				webapp?: string;
				src?: string;
				test?: string;
			};
		};
	};
}

function createProjectConfig(projectType: string, projectSrcPath?: string, projectTestPath?: string): ProjectConfig {
	let resourcesConfig: ProjectConfig["resources"] = {
		configuration: {
			paths: {},
		},
	};
	if (projectType === "application") {
		resourcesConfig.configuration.paths.webapp = projectSrcPath ?? "webapp";
	} else if (projectType === "library") {
		resourcesConfig.configuration.paths.src = projectSrcPath ?? "src";
		resourcesConfig.configuration.paths.test = projectTestPath ?? "test";
	} else {
		// Do not set a resources configuration for other project types
		resourcesConfig = undefined;
	}
	return {
		specVersion: "4.0",
		type: projectType,
		metadata: {
			name: "ui5-project-without-ui5-yaml",
		},
		resources: resourcesConfig,
	};
}

async function getVersionInfoForProject(
	project: Project
): Promise<GetProjectInfoResult["versionInfo"] | undefined> {
	const frameworkName = project.getFrameworkName();
	const frameworkVersion = project.getFrameworkVersion();
	if (!frameworkVersion || !isUi5Framework(frameworkName)) {
		return;
	}
	const {versions} = await getVersionInfo({
		frameworkName,
	});
	const latestVersion = versions.latest.version;

	const allLtsVersions = Object.values(versions).filter((v) => v.lts).map((v) => v.version);
	const latestLtsVersion = semver.maxSatisfying(allLtsVersions, "*") ?? undefined;

	for (const versionEntry of Object.values(versions)) {
		if (versionEntry.version === frameworkVersion) {
			return {
				supportStatus: versionEntry.support,
				isLts: versionEntry.lts,
				latestVersion,
				latestLtsVersion,
			};
		}
	}
	// Get major/minor for version
	const key = `${semver.major(frameworkVersion)}.${semver.minor(frameworkVersion)}`;
	if (versions[key]) {
		const versionEntry = versions[key];
		return {
			supportStatus: `Outdated patch version. Upgrade to '${versionEntry.version}'.`,
			isLts: versionEntry.lts,
			latestVersion,
			latestLtsVersion,
		};
	}
	return {
		supportStatus: "Out of Maintenance",
		latestVersion,
		latestLtsVersion,
	};
}
