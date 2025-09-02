import type {ExecutionContext} from "ava";
import {readdir, readFile} from "node:fs/promises";
import path from "node:path";

export async function findFiles(dirPath: string) {
	const files = await readdir(dirPath, {withFileTypes: true, recursive: true});
	return files.filter((file) => file.isFile()).map((file) => path.join(file.parentPath || file.path, file.name));
}

export async function readFileContent(filePath: string) {
	return await readFile(filePath, {encoding: "utf8"});
}

export async function directoryDeepEqual(t: ExecutionContext, destPath: string, expectedPath: string) {
	const dest = await readdir(destPath, {recursive: true});
	const expected = await readdir(expectedPath, {recursive: true});
	t.deepEqual(dest, expected);
}

export async function fileEqual(t: ExecutionContext, destPath: string, expectedPath: string) {
	const destContent = await readFileContent(destPath);
	const expectedContent = await readFileContent(expectedPath);
	t.is(destContent, expectedContent);
}

const newLineRegexp = /\r?\n|\r/g;
export async function checkFileContentsIgnoreLineFeeds(
	t: ExecutionContext, expectedFiles: string[], expectedPath: string, destPath: string
) {
	for (const expectedFile of expectedFiles) {
		const relativeFile = path.relative(expectedPath, expectedFile);
		const destFile = path.join(destPath, relativeFile);
		const currentFileContentPromise = readFile(destFile, "utf8");
		const expectedFileContentPromise = readFile(expectedFile, "utf8");
		const assertContents = ([currentContent, expectedContent]: string[]) => {
			if (expectedFile.endsWith(".json")) {
				try {
					t.deepEqual(JSON.parse(currentContent), JSON.parse(expectedContent), expectedFile);
				} catch (e) {
					t.falsy(e, expectedFile);
				}
			}
			t.is(currentContent.replace(newLineRegexp, "\n"),
				expectedContent.replace(newLineRegexp, "\n"),
				relativeFile);
		};
		await Promise.all([currentFileContentPromise, expectedFileContentPromise]).then(assertContents);
	}
}
