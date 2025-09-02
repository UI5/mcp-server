/* global QUnit */
sap.ui.define(["sap/ui/test/opaQunit", "./pages/Main"], function (opaTest) {
	"use strict";

<% if (!oDataEntitySet) { %>	QUnit.module("Sample Hello Journey");

	opaTest("Should open the Hello dialog", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyUIComponent({
			componentConfig: {
				name: "<%= appId %>"
			}
		});

		// Actions
		When.onTheMainPage.iPressTheSayHelloButton();

		// Assertions
		Then.onTheMainPage.iShouldSeeTheHelloDialog();

		// Actions
		When.onTheMainPage.iPressTheOkButtonInTheDialog();

		// Assertions
		Then.onTheMainPage.iShouldNotSeeTheHelloDialog();

		// Cleanup
		Then.iTeardownMyApp();
	});

	opaTest("Should close the Hello dialog", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyUIComponent({
			componentConfig: {
				name: "<%= appId %>"
			}
		});

		// Actions
		When.onTheMainPage.iPressTheSayHelloButton();
		When.onTheMainPage.iPressTheOkButtonInTheDialog();

		// Assertions
		Then.onTheMainPage.iShouldNotSeeTheHelloDialog();

		// Cleanup
		Then.iTeardownMyApp();
	});
<% } %><% if (oDataEntitySet) { %>	QUnit.module("Sample Data Journey");

	opaTest("Should display the data table", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyUIComponent({
			componentConfig: {
				name: "<%= appId %>"
			}
		});

		// Assertions
		Then.onTheMainPage.iShouldSeeTheDataTable();
		Then.onTheMainPage.iShouldSeeTheDetailForm();
		Then.onTheMainPage.iShouldSeeTableWithCorrectColumns();

		// Cleanup
		Then.iTeardownMyApp();
	});

	opaTest("Should select table row and populate detail form", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyUIComponent({
			componentConfig: {
				name: "<%= appId %>"
			}
		});

		// Actions
		When.onTheMainPage.iSelectFirstTableRow();

		// Assertions
		Then.onTheMainPage.iShouldSeeTheDetailForm();

		// Cleanup
		Then.iTeardownMyApp();
	});
<% } %>});
