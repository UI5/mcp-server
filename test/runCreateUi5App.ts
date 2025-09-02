/* eslint-disable no-console */
import {createUi5App} from "../src/tools/create_ui5_app/create_ui5_app.js";
import {fileURLToPath} from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Testing Node.js API...");

try {
	const result = await createUi5App({
		appNamespace: "com.test.apijsapp",
		framework: "SAPUI5",
		frameworkVersion: "1.136.7",
		author: "API Test",
		basePath: path.join(__dirname, "..", "tmp"),
		createAppDirectory: true,
		oDataV4Url: "https://services.odata.org/Trippin_Staging/(S(iw1anra4xygjyssbeef0yeyy))/",
		oDataEntitySet: "Airlines",
		// entityProperties: ["Name", "AirlineCode"],
		initializeGitRepository: false,
		typescript: false,
	});
	console.log("✅ API test successful!");
	console.log("Message:", result.message);
	console.log("Final Location:", result.finalLocation);
} catch (error) {
	console.error("❌ API test failed!");
	console.error("Error:", error instanceof Error ? error.message : String(error));
	process.exit(1);
}
