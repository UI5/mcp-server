import {createWriteStream} from "node:fs";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import fetch from "make-fetch-happen";
import {pipeline} from "node:stream/promises";

export async function downloadFile(url: string, targetDir: string) {
	const response = await fetch(url);
	if (!response.ok) {
		if (response.status === 404) {
			throw new Error(`The requested version does not exist`);
		} else {
			throw new Error(`Unexpected response ${response.status}: ${response.statusText}`);
		}
	}

	await mkdir(targetDir, {recursive: true});
	const fileName: string = url.split("/").pop()!;
	const filePath = path.join(targetDir, fileName);

	await pipeline(
		response.body,
		createWriteStream(filePath)
	);

	return filePath;
}
