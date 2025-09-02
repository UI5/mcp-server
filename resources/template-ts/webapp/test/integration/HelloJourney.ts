import opaTest from "sap/ui/test/opaQunit";
import MainPage from "./pages/MainPage";

const onTheMainPage = new MainPage();

<% if (!oDataEntitySet) { %>QUnit.module("Sample Hello Journey");

opaTest("Should open the Hello dialog", function () {
	// Arrangements
	onTheMainPage.iStartMyUIComponent({
		componentConfig: {
			name: "<%= appId %>"
		}
	});

	// Actions
	onTheMainPage.iPressTheSayHelloWithDialogButton();

	// Assertions
	onTheMainPage.iShouldSeeTheHelloDialog();

	// Actions
	onTheMainPage.iPressTheOkButtonInTheDialog();

	// Assertions
	onTheMainPage.iShouldNotSeeTheHelloDialog();

	// Cleanup
	onTheMainPage.iTeardownMyApp();
});

opaTest("Should close the Hello dialog", function () {
	// Arrangements
	onTheMainPage.iStartMyUIComponent({
		componentConfig: {
			name: "<%= appId %>"
		}
	});

	// Actions
	onTheMainPage.iPressTheSayHelloWithDialogButton();
	onTheMainPage.iPressTheOkButtonInTheDialog();

	// Assertions
	onTheMainPage.iShouldNotSeeTheHelloDialog();

	// Cleanup
	onTheMainPage.iTeardownMyApp();
});<% } %><% if (oDataEntitySet) { %>QUnit.module("Sample Data Journey");

opaTest("Should display the data table", function () {
	// Arrangements
	onTheMainPage.iStartMyUIComponent({
		componentConfig: {
			name: "<%= appId %>"
		}
	});

	// Assertions
	onTheMainPage.iShouldSeeTheDataTable();
	onTheMainPage.iShouldSeeTheDetailForm();
	onTheMainPage.iShouldSeeTableWithCorrectColumns();

	// Cleanup
	onTheMainPage.iTeardownMyApp();
});

opaTest("Should select table row and populate detail form", function () {
	// Arrangements
	onTheMainPage.iStartMyUIComponent({
		componentConfig: {
			name: "<%= appId %>"
		}
	});

	// Actions
	onTheMainPage.iSelectFirstTableRow();

	// Assertions
	onTheMainPage.iShouldSeeTheDetailForm();

	// Cleanup
	onTheMainPage.iTeardownMyApp();
});<% } %>
