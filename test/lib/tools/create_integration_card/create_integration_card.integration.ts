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
});

// Clean up after each test
test.afterEach.always((t) => {
	t.context.sinon.restore();
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

		// Build the merged expected tree under test/tmp so we never mutate test/expected.
		// findFiles(expectedPath) needs to see common/* alongside the card-type files.
		const commonFilesPath = path.join(expectedBasePath, "common");
		const cardTypeExpectedPath = path.join(expectedBasePath, cardType);
		const expectedPath = path.join(
			__dirname, "..", "..", "..", "tmp", "create_integration_card_expected", cardType
		);
		await rm(expectedPath, {recursive: true, force: true});
		await cp(cardTypeExpectedPath, expectedPath, {recursive: true});
		await cp(commonFilesPath, expectedPath, {recursive: true});

		const expectedFiles = await findFiles(expectedPath);

		// Check for all directories and files
		await directoryDeepEqual(t, folderPath, expectedPath);

		// Check for all file contents
		await checkFileContentsIgnoreLineFeeds(t, expectedFiles, expectedPath, folderPath);
	});
});

test.serial("Generate card template with single destination", async (t) => {
	const folderPath = path.join(
		__dirname, "..", "..", "..", "tmp", "create_integration_card_single_destination"
	);
	await rm(folderPath, {recursive: true, force: true});

	const destinations = [
		{
			name: "northwind",
			defaultUrl: "https://services.odata.org/V4/Northwind/Northwind.svc/",
		},
	];

	const result = await t.context.createIntegrationCard({
		folderPath,
		cardType: "List",
		manifestVersion: "1.78.0",
		destinations,
	});

	// Normalize paths for snapshot consistency across OSes
	const normalizedResult = result.map((filePath) => filePath.replaceAll(path.sep, "/")).sort();
	t.snapshot(
		normalizedResult,
		"Result of createIntegrationCard with single destination should match expected structure"
	);

	const expectedPath = path.join(expectedBasePath, "single_destination");
	const expectedFiles = await findFiles(expectedPath);

	// Check for all directories and files
	await directoryDeepEqual(t, folderPath, expectedPath);

	// Check for all file contents
	await checkFileContentsIgnoreLineFeeds(t, expectedFiles, expectedPath, folderPath);
});

test.serial("Generate card template with multiple destinations", async (t) => {
	const folderPath = path.join(__dirname, "..", "..", "..", "tmp", "create_integration_card_destinations");
	await rm(folderPath, {recursive: true, force: true});
	const destinations = [
		{
			name: "northwind",
			defaultUrl: "https://services.odata.org/V4/Northwind/Northwind.svc/",
		},
		{
			name: "myapi",
			defaultUrl: "http://localhost:8080/v1/",
		},
	];

	const result = await t.context.createIntegrationCard({
		folderPath,
		cardType: "List",
		manifestVersion: "1.78.0",
		destinations,
	});

	// Normalize paths for snapshot consistency across OSes
	const normalizedResult = result.map((filePath) => filePath.replaceAll(path.sep, "/")).sort();
	t.snapshot(normalizedResult, "Result of createIntegrationCard with destinations should match expected structure");

	const expectedPath = path.join(expectedBasePath, "destinations");
	const expectedFiles = await findFiles(expectedPath);

	// Check for all directories and files
	await directoryDeepEqual(t, folderPath, expectedPath);

	// Check for all file contents
	await checkFileContentsIgnoreLineFeeds(t, expectedFiles, expectedPath, folderPath);
});
