import Context from "../../src/Context.js";

export default class TestContext extends Context {
	// eslint-disable-next-line @typescript-eslint/require-await
	async normalizePath(fsPath: string): Promise<string> {
		return fsPath;
	}
}
