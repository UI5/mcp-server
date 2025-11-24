import {readFile} from "node:fs/promises";
import https from "https";

const typescriptConversionGuidelinesFileUrl = new URL(
	"../../../resources/typescript_conversion_guidelines.md",
	import.meta.url
);

async function getLatestVersion(packageName: string): Promise<string> {
	return new Promise((resolve, reject) => {
		https
			.get(`https://registry.npmjs.org/${packageName}`, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					try {
						const json = JSON.parse(data) as {"dist-tags": {latest: string}};
						resolve(json["dist-tags"].latest);
					} catch (_err) {
						reject(new Error(`Failed to parse response for package ${packageName}`));
					}
				});
			})
			.on("error", (err) => {
				reject(err);
			});
	});
}

async function getLatestVersions(dependencies: Record<string, string>) {
	const packageNames = Object.keys(dependencies);
	const versionPromises = packageNames.map((packageName) => {
		return getLatestVersion(packageName).catch((_error) => {
			return dependencies[packageName];
		});
	});

	const versions = await Promise.all(versionPromises);

	const latestVersions: Record<string, string> = {};
	packageNames.forEach((packageName, index) => {
		latestVersions[packageName] = versions[index];
	});

	return latestVersions;
}

const getLatestDependencies = async () => {
	const packages = await getLatestVersions({
		"@ui5/cli": "^4.0.36",
		"typescript": "^5.9.3",
		"typescript-eslint": "^8.47.0",
		"ui5-middleware-livereload": "^3.1.4",
		"ui5-tooling-transpile": "^3.9.2",
	});
	return JSON.stringify({
		devDependencies: packages,
	});
};

export async function getTypescriptConversionGuidelines(): Promise<string> {
	let guidelines = await readFile(typescriptConversionGuidelinesFileUrl, {encoding: "utf-8"});
	guidelines = guidelines.replace("{{dependencies}}", JSON.stringify(await getLatestDependencies(), null, 3));
	return guidelines;
}
