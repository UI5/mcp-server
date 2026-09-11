import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import path from "path";
import {InvalidInputError} from "../../src/utils.js";

const absoluteBasePath = path.join(process.cwd(), "test", "tmp", "normalize-path");

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

test("normalizePath throws error when realpath fails", async (t) => {
	const {Context, realpathStub} = t.context;

	const inputPath = path.join(absoluteBasePath, "nonexistent", "path");
	const fsError = new Error("ENOENT: no such file or directory");
	realpathStub.rejects(fsError);

	const context = new Context();

	const error = await t.throwsAsync(() => context.normalizePath(inputPath));
	t.is(error, fsError);
});
