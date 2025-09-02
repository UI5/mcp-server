import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {pathToFileURL} from "url";
import path from "path";
import {InvalidInputError} from "../../src/utils.js";

const absoluteBasePath = path.join(process.cwd(), "test", "tmp", "roots");

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	ContextModule: typeof import("../../src/Context.js");
	Context: typeof import("../../src/Context.js").default;
	realpathStub: sinonGlobal.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Create stubs for fs functions
	const realpathStub = t.context.sinon.stub();
	t.context.realpathStub = realpathStub;

	// Import the module with mocked dependencies
	t.context.ContextModule = await esmock.p("../../src/Context.js", {
		"node:fs/promises": {
			realpath: realpathStub,
		},
	});

	t.context.Context = t.context.ContextModule.default;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
	esmock.purge(t.context.ContextModule);
});

test("Update roots", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPathAllowedInitially = path.join(absoluteBasePath, "root1", "foo");
	const inputPathAllowedAfterUpdate = path.join(absoluteBasePath, "root3", "foo");
	const inputPathNeverAllowed = path.join(absoluteBasePath, "root5", "foo");
	const rootPath1 = path.join(absoluteBasePath, "root1");
	const rootPath2 = path.join(absoluteBasePath, "root2");
	const context = new Context();
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	context.setRoots([
		{uri: pathToFileURL(rootPath1).toString()},
		{uri: pathToFileURL(rootPath2).toString()},
	]);

	t.truthy(await context.normalizePath(inputPathAllowedInitially));
	await t.throwsAsync(() => context.normalizePath(inputPathNeverAllowed), {
		instanceOf: InvalidInputError,
		message: /Path must be inside an allowed root path/,
	});

	const rootPath3 = path.join(absoluteBasePath, "root3");
	const rootPath4 = path.join(absoluteBasePath, "root4");
	context.setRoots([
		{uri: pathToFileURL(rootPath3).toString()},
		{uri: pathToFileURL(rootPath4).toString()},
	]);

	await t.throwsAsync(() => context.normalizePath(inputPathAllowedInitially), {
		instanceOf: InvalidInputError,
		message: /Path must be inside an allowed root path/,
	});
	await t.throwsAsync(() => context.normalizePath(inputPathNeverAllowed), {
		instanceOf: InvalidInputError,
		message: /Path must be inside an allowed root path/,
	});
	t.truthy(await context.normalizePath(inputPathAllowedAfterUpdate));
});

test("normalizePath returns resolved path", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPath = path.join(absoluteBasePath, "some", "path", "..", "custom", "path");
	const resolvedPath = path.join(absoluteBasePath, "some", "resolved", "absolute", "path");
	realpathStub.resolves(resolvedPath);

	const context = new Context();
	const result = await context.normalizePath(inputPath);

	t.is(result, resolvedPath);
	t.true(realpathStub.calledOnce);
	t.is(realpathStub.firstCall.firstArg, path.join(absoluteBasePath, "some", "custom", "path"));
});

test("normalizePath returns resolved path for valid absolute path", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPath = path.join(absoluteBasePath, "some", "absolute", "path", "/");
	const resolvedPath = path.join(absoluteBasePath, "some", "resolved", "absolute", "path");
	realpathStub.resolves(resolvedPath);

	const context = new Context();
	const result = await context.normalizePath(inputPath);

	t.is(result, resolvedPath);
	t.true(realpathStub.calledOnce);
	t.is(realpathStub.firstCall.firstArg, inputPath);
});

test("normalizePath throws error for relative path", async (t) => {
	const {Context} = t.context;

	const relativePath = path.join("relative", "path");
	const context = new Context();

	await t.throwsAsync(() => context.normalizePath(relativePath), {
		instanceOf: InvalidInputError,
		message: `Path must be absolute: ${relativePath}`,
	});
});

test("normalizePath allows any path when no roots are configured", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPath = path.join(absoluteBasePath, "any", "absolute", "path");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	const result = await context.normalizePath(inputPath);

	t.is(result, inputPath);
});

test("normalizePath allows path inside configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "allowed", "root", "subdir", "file.txt");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const result = await context.normalizePath(inputPath);

	t.is(result, inputPath);
});
test("normalizePath allows path equal to configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "allowed", "root"); // Equal to root
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const result = await context.normalizePath(inputPath);

	t.is(result, inputPath);
});

test("normalizePath allows resolved path inside configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "outside", "..", "allowed", "root", "subdir", "file.txt");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const result = await context.normalizePath(inputPath);

	t.is(result, path.join(absoluteBasePath, "allowed", "root", "subdir", "file.txt"));
});

test("normalizePath throws error for path outside configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "outside", "root", "file.txt");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.true(error instanceof InvalidInputError);
	t.true(error?.message.includes("Path must be inside an allowed root path"));
	t.true(error?.message.includes(inputPath));
	t.true(error?.message.includes(rootPath));
	t.false(realpathStub.calledOnce, "realpath did not get invoked for path outside allowed roots");
});

test("normalizePath throws error for resolved path outside configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "allowed", "root", "..", "outside", "file.txt");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.true(error instanceof InvalidInputError);
	t.true(error?.message.includes("Path must be inside an allowed root path"));
	t.true(error?.message.includes(inputPath));
	t.true(error?.message.includes(rootPath));
});

test("normalizePath throws error for symlink (realpath) outside configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "allowed", "root", "symlink", "file.txt");
	// Simulate symlink resolution through realpath
	const resolvedPath = path.join(absoluteBasePath, "outside", "root", "file.txt");
	realpathStub.resolves(resolvedPath);

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.true(error instanceof InvalidInputError);
	t.true(error?.message.includes("Path must be inside an allowed root path"));
	t.true(error?.message.includes(inputPath));
	t.true(error?.message.includes(rootPath));
});

test("normalizePath throws error for path outside (but starting with) configured root", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath = path.join(absoluteBasePath, "allowed", "root");
	const inputPath = path.join(absoluteBasePath, "allowed", "root_secret_path", "file.txt");
	realpathStub.resolvesArg(0); // Simulate realpath returning the input path

	const context = new Context();
	context.setRoots([{uri: pathToFileURL(rootPath).toString()}]);

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.true(error instanceof InvalidInputError);
	t.true(error?.message.includes("Path must be inside an allowed root path"));
	t.true(error?.message.includes(inputPath));
	t.true(error?.message.includes(rootPath));
	t.false(realpathStub.calledOnce, "realpath did not get invoked for path outside allowed roots");
});

test("normalizePath allows path inside any of multiple configured roots", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath1 = path.join(absoluteBasePath, "allowed", "root1");
	const rootPath2 = path.join(absoluteBasePath, "allowed", "root2");
	const inputPath = path.join(absoluteBasePath, "allowed", "root2", "subdir", "file.txt");
	const resolvedPath = path.join(absoluteBasePath, "allowed", "root2", "subdir", "file.txt");
	realpathStub.resolves(resolvedPath);

	const context = new Context();
	context.setRoots([
		{uri: pathToFileURL(rootPath1).toString()},
		{uri: pathToFileURL(rootPath2).toString()},
	]);

	const result = await context.normalizePath(inputPath);

	t.is(result, resolvedPath);
});

test("normalizePath throws error when path is outside all configured roots", async (t) => {
	const {Context, realpathStub} = t.context;

	const rootPath1 = path.join(absoluteBasePath, "allowed", "root1");
	const rootPath2 = path.join(absoluteBasePath, "allowed", "root2");
	const inputPath = path.join(absoluteBasePath, "outside", "all", "roots", "file.txt");
	const resolvedPath = path.join(absoluteBasePath, "outside", "all", "roots", "file.txt");
	realpathStub.resolves(resolvedPath);

	const context = new Context();
	context.setRoots([
		{uri: pathToFileURL(rootPath1).toString()},
		{uri: pathToFileURL(rootPath2).toString()},
	]);

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.true(error instanceof InvalidInputError);
	t.true(error?.message.includes("Path must be inside an allowed root path"));
	t.true(error?.message.includes(inputPath));
	t.true(error?.message.includes(rootPath1));
	t.true(error?.message.includes(rootPath2));
});

test("normalizePath throws error when realpath fails", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPath = path.join(absoluteBasePath, "nonexistent", "path");
	const fsError = new Error("ENOENT: no such file or directory");
	realpathStub.rejects(fsError);

	const context = new Context();

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.is(error, fsError);
});
