import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import type getProjectInfo from "../../../../src/tools/get_project_info/getProjectInfo.js";
import path from "node:path";
import {fileURLToPath} from "url";
import {GetProjectInfoResult} from "../../../../src/tools/get_project_info/schema.js";
import esmock from "esmock";
import {InvalidInputError} from "../../../../src/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const linterFixturesPath = path.join(__dirname, "..", "..", "..", "fixtures", "run_ui5_linter");
const projectInfoFixturesPath = path.join(__dirname, "..", "..", "..", "fixtures", "get_project_info");

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	getProjectInfo: typeof getProjectInfo;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const getVersionInfoStub = t.context.sinon.stub().resolves({
		versions: {
			latest: {
				version: "1.138.1",
				support: "Maintenance",
				lts: false,
			},
			active: {
				version: "1.138.1",
				support: "Maintenance",
				lts: false,
			},
			1.138: {
				version: "1.138.1",
				support: "Maintenance",
				lts: false,
			},
			1.136: {
				version: "1.136.4",
				support: "Maintenance",
				lts: true,
			},
		},
	});

	const {default: getProjectInfo} = await esmock("../../../../src/tools/get_project_info/getProjectInfo.js", {
		"../../../../src/tools/get_version_info/getVersionInfo.js": getVersionInfoStub,
	});
	t.context.getProjectInfo = getProjectInfo;
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

function cleanResult(res: GetProjectInfoResult) {
	res.projectDir = "<correct projectDir>";
}

test("Get project info", async (t) => {
	const projectPath = path.join(linterFixturesPath, "openui5-sample-app");
	const res = await t.context.getProjectInfo(projectPath);
	t.is(res.projectDir, projectPath);
	cleanResult(res);
	t.snapshot(res);
});

test("Get project info from file path", async (t) => {
	const projectPath = path.join(linterFixturesPath, "openui5-sample-app");
	const res = await t.context.getProjectInfo(path.join(projectPath, "webapp", "controller", "App.controller.js"));
	t.is(res.projectDir, projectPath);
	cleanResult(res);
	t.snapshot(res);
});

test("Get project info with version info", async (t) => {
	const projectPath = path.join(linterFixturesPath, "openui5-sample-app");
	const res = await t.context.getProjectInfo(projectPath, true);
	t.is(res.projectDir, projectPath);
	cleanResult(res);
	t.snapshot(res);
});

test("Incorrect project path", async (t) => {
	const projectPath = path.join(linterFixturesPath);
	await t.throwsAsync(async () => {
		await t.context.getProjectInfo(projectPath, true);
	}, {
		instanceOf: InvalidInputError,
		message:
			`Unable to find a UI5 project at ${projectPath}. ` +
			`Make sure the provided path is correct and contains a valid UI5 project`,
	});
});

test("Project without ui5.yaml", async (t) => {
	const projectPath = path.join(projectInfoFixturesPath, "basic-app");
	const res = await t.context.getProjectInfo(projectPath, true);
	t.is(res.projectDir, projectPath);
	cleanResult(res);
	t.snapshot(res);
});
