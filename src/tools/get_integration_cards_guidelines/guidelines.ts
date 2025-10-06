import {readFile} from "node:fs/promises";

const guidelinesFileUrl = new URL("../../../resources/integration_cards_guidelines.md", import.meta.url);

export async function getGuidelines(): Promise<string> {
	return readFile(guidelinesFileUrl, {encoding: "utf-8"});
}
