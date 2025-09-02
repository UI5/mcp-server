export default {
	name: "QUnit test suite for the UI5 Application: com.test.apiapp",
	defaults: {
		page: "ui5://test-resources/com/test/apiapp/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: {
			version: 2
		},
		sinon: {
			version: 4
		},
		ui5: {
			language: "EN",
			theme: "sap_horizon"
		},
		coverage: {
			only: "com/test/apiapp/",
			never: "test-resources/com/test/apiapp/"
		},
		loader: {
			paths: {
				"com/test/apiapp": "../"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "Unit tests for com.test.apiapp"
		},
		"integration/opaTests": {
			title: "Integration tests for com.test.apiapp"
		}
	}
};
