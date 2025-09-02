import {LintResult} from "@ui5/linter";
import Ui5TypeInfoMatcher, {Ui5TypeInfo} from "@ui5/linter/Ui5TypeInfoMatcher";
import {readFile} from "fs/promises";

type GuideTypeInfoMatcher = Ui5TypeInfoMatcher<string>;

export default async function getMigrationGuidesForResults(results: LintResult[]) {
	const matchers = new Set<GuideTypeInfoMatcher>();
	matchers.add(createGlobalMigrationGuideMatcher());
	matchers.add(createJqueryMigrationGuideMatcher());
	matchers.add(createSapMMigrationGuideMatcher());
	matchers.add(createSapUiCoreMigrationGuideMatcher());
	matchers.add(createSapUiTableTableMigrationGuideMatcher());

	const migrationGuidesBasePath = new URL(`../../../resources/migrationGuides`, import.meta.url);

	const migrationGuidePaths = new Set<string>();
	for (const result of results) {
		for (const msg of result.messages) {
			if (msg.ui5TypeInfo) {
				const migrationGuidePath = getMigrationGuidePathForUi5TypeInfo(msg.ui5TypeInfo, matchers);
				if (migrationGuidePath) {
					migrationGuidePaths.add(migrationGuidePath);
				}
			}
		}
	}

	return await Promise.all(
		Array.from(migrationGuidePaths).map(async (migrationGuidePath) => {
			const fileUrl = new URL(`${migrationGuidesBasePath}/${migrationGuidePath}`);
			return {
				title: migrationGuidePath,
				text: await readFile(fileUrl, "utf8"),
				uri: `ui5-linter-result://migration-guides/${migrationGuidePath}`,
			};
		})
	);
}

function getMigrationGuidePathForUi5TypeInfo(ui5TypeInfo: Ui5TypeInfo, matchers: Set<GuideTypeInfoMatcher>) {
	for (const matcher of matchers) {
		const migrationGuidePath = matcher.match(ui5TypeInfo);
		if (migrationGuidePath) {
			return migrationGuidePath;
		}
	}
}

function createGlobalMigrationGuideMatcher() {
	const m: GuideTypeInfoMatcher = new Ui5TypeInfoMatcher();
	m.declareNamespace("sap", [
		m.namespace("ui", [
			m.function("controller", "deprecated-controller-factory.md"),
		]),
	]);
	return m;
}

function createJqueryMigrationGuideMatcher() {
	/**
	 * NOTE: Since jQuery.sap APIs are not fully typed, UI5 linter generates "mocked" UI5 Type Info.
	 * To keep it simple, that module simply treats everything as a NAMESPACE.
	 *
	 * Therefore, the filters expressed below MUST ALWAYS USE NAMESPACE, regardless of the actual type.
	*/
	const m: GuideTypeInfoMatcher = new Ui5TypeInfoMatcher("jquery");
	m.declareModule("jQuery", [
		m.namespace("sap", [
			m.namespace("declare", "deprecated-jquery-sap-require.md"),
			m.namespace("require", "deprecated-jquery-sap-require.md"),
		]),
	]);
	return m;
}

function createSapMMigrationGuideMatcher() {
	const m: GuideTypeInfoMatcher = new Ui5TypeInfoMatcher("sap.m");

	m.declareModule("sap/m/MessagePage", "deprecated-message-page.md");
	return m;
}

function createSapUiCoreMigrationGuideMatcher() {
	const m: GuideTypeInfoMatcher = new Ui5TypeInfoMatcher("sap.ui.core");
	// TODO: Core.getLibraryResourceBundle => sap.ui.core.Lib.getResourceBundleFor
	return m;
}

function createSapUiTableTableMigrationGuideMatcher() {
	const m: GuideTypeInfoMatcher = new Ui5TypeInfoMatcher("sap.ui.table");
	m.declareModule("sap/ui/table/Table", [
		m.managedObjectSetting("$TableSettings", [
			m.metadataProperty("rowHeight", "deprecated-table-table-property.md"),
			m.metadataProperty("visibleRowCountMode", "deprecated-table-table-property.md"),
			m.metadataProperty("visibleRowCount", "deprecated-table-table-property.md"),
			m.metadataProperty("minAutoRowCount", "deprecated-table-table-property.md"),
			m.metadataProperty("fixedRowCount", "deprecated-table-table-property.md"),
			m.metadataProperty("fixedBottomRowCount", "deprecated-table-table-property.md"),
		]),
	]);
	return m;
}
