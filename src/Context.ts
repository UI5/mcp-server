import {realpath} from "fs/promises";
import path, {isAbsolute} from "path";
import {InvalidInputError} from "./utils.js";
import {fileURLToPath} from "url";

interface Root {
	/**
	 * @property uri - The unique identifier for the root, which must be a file:// URI.
	*/
	uri: string;
	/**
	 * @property name - An optional human-readable name for the root, used for display purposes.
	*/
	name?: string;
}

type Roots = Root[];

export default class Context {
	private allowedRootPaths: string[] = [];

	constructor(private useStructuredContentInResponse = true, private useResourcesInResponse = true) {}

	/**
	 * Normalizes a path, ensuring it is absolute, exists, and is inside one of the configured roots (if configured).
	 *
	 * @param fsPath - The directory path to normalize.
	 * @returns A promise that resolves to the normalized absolute path.
	 * @throws InvalidInputError if the path is not absolute or not inside the allowed roots.
	 */
	async normalizePath(fsPath: string): Promise<string> {
		// First normalize the path in order to safely check whether it is absolute
		const absolutePath = path.normalize(fsPath);
		if (!isAbsolute(absolutePath)) {
			throw new InvalidInputError(`Path must be absolute: ${fsPath}`);
		}

		// If roots are configured, already check whether the path is inside one of the roots before
		// resolving it using the file system in order to prevent probing for the existence of files
		// outside the roots
		if (!this.isInsideRoots(absolutePath)) {
			throw new InvalidInputError(
				`Path must be inside an allowed root path: ${fsPath}.\n` +
				`Currently configured roots: ${this.allowedRootPaths.map((rootPath) => rootPath).join(", ")}`);
		}
		// Get the actual location of the path on the file system:
		// This checks whether the path exists and resolves any symbolic links.
		// Note that realpath also accepts relative paths (and makes them absolute), hence the dedicated check above
		const resolvedPath = await realpath(absolutePath);

		// Ensure the resulting path is still inside one of the roots
		if (!this.isInsideRoots(resolvedPath)) {
			throw new InvalidInputError(
				`Path must be inside an allowed root path: ${fsPath}.\n` +
				`Currently configured roots: ${this.allowedRootPaths.map((rootPath) => rootPath).join(", ")}`);
		}
		return resolvedPath;
	}

	setRoots(roots: Roots) {
		const newRoots = [];
		for (const root of roots) {
			let rootPath = fileURLToPath(root.uri);

			// Ensure path ends in a slash since we only work with directories here
			if (!rootPath.endsWith(path.sep)) {
				rootPath += path.sep;
			}
			newRoots.push(rootPath);
		}
		// Always overwrite existing roots. Never append
		this.allowedRootPaths = newRoots;
	}

	isInsideRoots(absolutePath: string): boolean {
		if (!this.allowedRootPaths.length) {
			return true;
		}

		// Ensure the path to be tested ends in a slash since the roots will always end in a slash
		// Otherwise "/foo/bar" would not match a "/foo/bar/" root
		if (!absolutePath.endsWith(path.sep)) {
			absolutePath += path.sep;
		}

		return this.allowedRootPaths.some((rootPath) => {
			return absolutePath.startsWith(rootPath);
		});
	}
}
