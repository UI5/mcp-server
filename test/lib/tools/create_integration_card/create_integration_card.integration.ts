import anyTest, {TestFn} from "ava";
import path from "node:path";
import {cp, rm} from "node:fs/promises";
import esmock from "esmock";
import sinonGlobal from "sinon";
import {fileURLToPath} from "url";
import {checkFileContentsIgnoreLineFeeds, directoryDeepEqual, findFiles} from "../../../utils/fshelper.js";
import {supportedCardTypes} from "../../../../src/tools/create_integration_card/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expectedBasePath = path.join(__dirname, "..", "..", "..", "expected", "create_integration_card");

// Define test context type
const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	loggerMock: {
		silly: sinonGlobal.SinonStub;
		verbose: sinonGlobal.SinonStub;
		perf: sinonGlobal.SinonStub;
		info: sinonGlobal.SinonStub;
		warn: sinonGlobal.SinonStub;
		error: sinonGlobal.SinonStub;
		isLevelEnabled: sinonGlobal.SinonStub;
	};
	createIntegrationCard: typeof import(
		"../../../../src/tools/create_integration_card/create_integration_card.js"
	).createIntegrationCard;
	copiedFiles: string[];
}>;

// Setup test context before each test
test.beforeEach(async (t) => {
	// Create a sandbox for sinon stubs
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

	// Mock the @ui5/logger module
	const {createIntegrationCard} = await esmock(
		"../../../../src/tools/create_integration_card/create_integration_card.js", {
			"@ui5/logger": {
				getLogger: t.context.sinon.stub().returns(loggerMock),
				isLogLevelEnabled: t.context.sinon.stub().returns(true),
			},
		}
	);

	t.context.createIntegrationCard = createIntegrationCard;
	t.context.copiedFiles = [];
});

// Clean up after each test
test.afterEach.always(async (t) => {
	t.context.sinon.restore();

	// Clean up any copied common files
	for (const copiedFile of t.context.copiedFiles) {
		await rm(copiedFile, {force: true});
	}
});

supportedCardTypes.forEach((cardType) => {
	test.serial(`Generate ${cardType} card template`, async (t) => {
		const folderPath = path.join(__dirname, "..", "..", "..", "tmp", "create_integration_card");
		await rm(folderPath, {recursive: true, force: true});
		const result = await t.context.createIntegrationCard({
			folderPath,
			cardType,
			manifestVersion: "1.78.0",
		});
		// Normalize paths for snapshot consistency across OSes
		const normalizedResult = result.map((filePath) => filePath.replaceAll(path.sep, "/")).sort();
		t.snapshot(normalizedResult, "Result of createIntegrationCard should match expected structure");

		const commonFilesPath = path.join(expectedBasePath, "common");
		const expectedPath = path.join(expectedBasePath, cardType);
		const commonFiles = await findFiles(commonFilesPath);

		// Copy common files into the card-specific expected folder so findFiles(expectedPath)
		// will include them as part of the expected set.
		const destExpectedPath = path.join(expectedBasePath, cardType);
		await cp(commonFilesPath, destExpectedPath, {recursive: true});

		// Record all copied file paths relative to destExpectedPath
		for (const commonFile of commonFiles) {
			const relativePath = path.relative(commonFilesPath, commonFile);
			const destFilePath = path.join(destExpectedPath, relativePath);
			t.context.copiedFiles.push(destFilePath);
		}

		const expectedFiles = await findFiles(expectedPath);

		// Check for all directories and files
		await directoryDeepEqual(t, folderPath, expectedPath);

		// Check for all file contents
		await checkFileContentsIgnoreLineFeeds(t, expectedFiles, expectedPath, folderPath);
	});
});
