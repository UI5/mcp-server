const nodeArguments = [
	"--import=tsx/esm",
	"--no-warnings=ExperimentalWarning",
];

export default {
	extensions: {
		ts: "module",
	},
	files: [
		"test/lib/**/*.ts",
		"test/scripts/**/*.ts",
	],
	watchMode: {
		ignoreChanges: [
			"tmp/**",
			"test/tmp/**",
			"lib/**",
		],
	},
	nodeArguments,
	workerThreads: false,
	timeout: "20s", // Increased timeout for slower CI environments
};
