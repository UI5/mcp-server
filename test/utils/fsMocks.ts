/* eslint-disable @typescript-eslint/require-await */

import {PassThrough} from "node:stream";
import {SinonSandbox} from "sinon";

// Helper to create a mock for fs/promises and fs
export function createFsMocks(sinon: SinonSandbox) {
	const dirs = new Set();
	const files = new Map();
	return {
		modules: {
			"node:fs/promises": {
				mkdir: async (dir: unknown, _opts: unknown) => {
					dirs.add(dir);
				},
				rename: async (src: unknown, dest: unknown) => {
					const data = files.get(src);
					files.delete(src);
					files.set(dest, data);
				},
				rm: async (target: unknown, _opts: unknown) => {
					dirs.delete(target);
					files.delete(target);
				},
				unlink: async (file: unknown) => {
					files.delete(file);
				},
				writeFile: async (file: unknown, data: unknown) => {
					files.set(file, data);
				},
			},
			"node:fs": {
				createWriteStream: sinon.stub().callsFake(() => {
					const stream = new PassThrough();
					return stream;
				}),
			},
		},
		dirs,
		files,
	};
}
