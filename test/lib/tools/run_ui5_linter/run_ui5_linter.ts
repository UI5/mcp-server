import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import path from "node:path";
import type runUi5Linter from "../../../../src/tools/run_ui5_linter/runUi5Linter.js";
import {cp, mkdir, rm} from "node:fs/promises";
import {RunUi5LinterResult} from "../../../../src/tools/run_ui5_linter/schema.js";
import esmock from "esmock";
import getProjectInfo from "../../../../src/tools/get_project_info/getProjectInfo.js";
import {fileURLToPath} from "node:url";
import type {
	getDocumentationByLoio, getDocumentationByUrl,
} from "../../../../src/resources/documentation/getDocumentation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixturesPath = path.join(__dirname, "..", "..", "..", "fixtures", "run_ui5_linter");

const API_JSON_FIXTURES_DIR = fileURLToPath(
	new URL("../../../../test/fixtures/api_json_files/openui5-1.120.30", import.meta.url)
);

function cleanResult(res: RunUi5LinterResult) {
	// Clear root dir
	res.projectDir = "<root dir>";
	res.contextInformation?.migrationGuides.forEach((migrationGuidesEntry) => {
		migrationGuidesEntry.uri = "<fix hint uri>";
	});
	res.results.forEach((result) => {
		// Convert to posix paths to align snapshots across platforms
		result.filePath = result.filePath.replace(/\\/g, "/");
	});
	return res;
}

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	runUi5Linter: typeof runUi5Linter;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Create logger mock
	const loggerMock = {
		silly: t.context.sinon.stub(),
		verbose: t.context.sinon.stub(),
		perf: t.context.sinon.stub(),
		info: t.context.sinon.stub(),
		warn: t.context.sinon.stub(),
		error: t.context.sinon.stub(),
		isLevelEnabled: t.context.sinon.stub().returns(true),
	};
	t.context.loggerMock = loggerMock;

	const getProjectInfoStub = t.context.sinon.stub<
		Parameters<typeof getProjectInfo>, ReturnType<typeof getProjectInfo>>().callsFake((projectDir) => {
		return Promise.resolve({
			projectDir,
			projectName: "openui5-sample-app",
			projectType: "application",
			frameworkVersion: "1.134.0",
			versionInfo: {
				supportStatus: "Maintenance",
				latestVersion: "1.138.1",
				latestLtsVersion: "1.136.4",
				isLts: false,
			},
		});
	});

	const getDocumentationByUrlStub = t.context.sinon.stub<
		Parameters<typeof getDocumentationByUrl>,
		ReturnType<typeof getDocumentationByUrl>
	>().callsFake((url) => {
		return Promise.resolve({
			title: `<title for ${url}>`,
			text: "<text>",
			uri: "<uri>",
		});
	});

	const getDocumentationByLoioStub = t.context.sinon.stub<
		Parameters<typeof getDocumentationByLoio>,
		ReturnType<typeof getDocumentationByLoio>
	>().callsFake((loio) => {
		return Promise.resolve({
			title: `<title for ${loio}>`,
			text: "<text>",
			uri: "<uri>",
		});
	});

	const {default: runUi5Linter} = await esmock("../../../../src/tools/run_ui5_linter/runUi5Linter.js", {
		"../../../../src/tools/get_project_info/getProjectInfo.js": getProjectInfoStub,
		"@ui5/logger": {
			getLogger: t.context.sinon.stub().returns(loggerMock),
			isLogLevelEnabled: t.context.sinon.stub().returns(true),
		},
	}, {
		"../../../../src/tools/get_api_reference/lib/apiReferenceResources.js": {
			getApiJsonDir: () =>
				Promise.resolve(API_JSON_FIXTURES_DIR),
		},
		"../../../../src/resources/documentation/getDocumentation.ts": {
			getDocumentationByUrl: getDocumentationByUrlStub,
			getDocumentationByLoio: getDocumentationByLoioStub,
		},
	});
	t.context.runUi5Linter = runUi5Linter;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.only("Lint Project", async (t) => {
	const projectDir = path.join(fixturesPath, "openui5-sample-app");
	const res = await t.context.runUi5Linter({
		projectDir,
		provideContextInformation: true,
		fix: false,
	});
	cleanResult(res);
	t.snapshot(res);

	// Verify no errors were logged
	t.is(t.context.loggerMock.error.callCount, 0, "No errors should be logged during successful linting");
});

test("Lint Single File", async (t) => {
	const projectDir = path.join(fixturesPath, "openui5-sample-app");
	const res = await t.context.runUi5Linter({
		projectDir,
		provideContextInformation: false,
		fix: false,
		filePatterns: ["webapp/controller/App.controller.js"],
	});
	cleanResult(res);
	t.snapshot(res);
});

test("Fix Project", async (t) => {
	const sourcePath = path.join(fixturesPath, "openui5-sample-app");
	// Copy project to tmp
	const projectDir = path.join(__dirname, "..", "..", "..", "tmp", "run_ui5_linter", "fix-openui5-sample-app");
	await rm(projectDir, {recursive: true, force: true});
	await mkdir(projectDir, {recursive: true});
	await cp(sourcePath, projectDir, {
		recursive: true,
	});

	const res = await t.context.runUi5Linter({
		projectDir,
		provideContextInformation: false,
		fix: true,
	});
	cleanResult(res);
	t.snapshot(res);
});
