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

const getLatestDevDependencies = async () => {
	const packages = await getLatestVersions({
		"@ui5/cli": "^4",
		"typescript": "^5",
		"typescript-eslint": "^8",
		"ui5-middleware-livereload": "^3",
		"ui5-tooling-transpile": "^3",
	});
	return {
		devDependencies: packages,
	};
};

const getLatestTsInterfaceGeneratorVersion = async () => {
	const version = await getLatestVersion("@ui5/ts-interface-generator").catch(() => {
		return "^0";
	});
	return version;
};

export async function getTypescriptConversionGuidelines(): Promise<string> {
	let guidelines = await readFile(typescriptConversionGuidelinesFileUrl, {encoding: "utf-8"});
	guidelines = guidelines
		.replace("{{dependencies}}", JSON.stringify(await getLatestDevDependencies(), null, 3))
		.replace("{{ts-interface-generator-version}}", await getLatestTsInterfaceGeneratorVersion());
	return guidelines;
}
