import {realpath} from "fs/promises";
import path, {isAbsolute} from "path";
import {InvalidInputError} from "./utils.js";

export default class Context {
	constructor(private useStructuredContentInResponse = true, private useResourcesInResponse = true) {}

	/**
	 * Normalizes a path, ensuring it is absolute and exists.
	 *
	 * @param fsPath - The directory path to normalize.
	 * @returns A promise that resolves to the normalized absolute path.
	 * @throws InvalidInputError if the path is not absolute.
	 */
	async normalizePath(fsPath: string): Promise<string> {
		// First normalize the path in order to safely check whether it is absolute
		const absolutePath = path.normalize(fsPath);
		if (!isAbsolute(absolutePath)) {
			throw new InvalidInputError(`Path must be absolute: ${fsPath}`);
		}

		// Get the actual location of the path on the file system:
		// This checks whether the path exists and resolves any symbolic links.
		// Note that realpath also accepts relative paths (and makes them absolute), hence the dedicated check above
		return realpath(absolutePath);
	}
}
