import path from "node:path";
import {LintResult, UI5LinterEngine} from "@ui5/linter";
import {Mutex} from "async-mutex";
import {outputSchema, RunUi5LinterParams, RunUi5LinterResult} from "./schema.js";
import {createResultContext} from "./resultContext.js";
import {GetProjectInfoResult} from "../get_project_info/schema.js";
import getProjectInfo from "../get_project_info/getProjectInfo.js";

const linterEngine = new UI5LinterEngine();
// The TypeScript compiler used within UI5 linter requires us to only run one linter instance per Node process
const linterMutex = new Mutex();

const projectInfoCache = new Map<string, GetProjectInfoResult>();

export default async function runUi5Linter({
	projectDir, filePatterns, fix, provideContextInformation,
}: RunUi5LinterParams): Promise<RunUi5LinterResult> {
	const projectInfo = await getProjectInfoCached(projectDir);
	if (filePatterns?.length) {
		// Make file patterns relative to root dir in case they are absolute
		filePatterns = filePatterns.map((pattern) => {
			return path.isAbsolute(pattern) ? path.relative(projectInfo.projectDir, pattern) : pattern;
		});
	}

	const release = await linterMutex.acquire();
	try {
		const results = await linterEngine.lint({
			rootDir: projectInfo.projectDir,
			filePatterns,
			fix,
			details: true,
		});

		let contextInformation;
		if (provideContextInformation) {
			contextInformation = await createResultContext(results);
		}
		formatLintResults(results);
		return {
			results,
			projectDir: projectInfo.projectDir,
			frameworkVersion: projectInfo.frameworkVersion,
			contextInformation,
		};
	} finally {
		release();
	}
}

async function getProjectInfoCached(fsPath: string) {
	if (projectInfoCache.has(fsPath)) {
		return projectInfoCache.get(fsPath)!;
	}
	// Resolve rootDir using UI5 Project API
	// This is required if the provided directory is not the root directory but a sub-directory of the project
	const projectInfo = await getProjectInfo(fsPath);
	projectInfoCache.set(fsPath, projectInfo);
	projectInfoCache.set(projectInfo.projectDir, projectInfo);
	return projectInfo;
}

const RESULT_PROPS_TO_KEEP = Object.keys(outputSchema.results.element.shape);
const MESSAGE_PROPS_TO_KEEP = Object.keys(outputSchema.results.element.shape.messages.element.shape);

function formatLintResults(results: LintResult[]) {
	for (const result of results) {
		filterProperties(result as unknown as Record<string, unknown>, RESULT_PROPS_TO_KEEP);
		result.messages = result.messages.map((msg) => {
			filterProperties(msg as unknown as Record<string, unknown>, MESSAGE_PROPS_TO_KEEP);
			return msg;
		});
	}
}

function filterProperties(obj: Record<string, unknown>, allowedProps: string[]) {
	for (const prop of Object.keys(obj)) {
		if (!allowedProps.includes(prop)) {
			delete obj[prop];
		}
	}
}
