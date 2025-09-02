import Opa5 from "sap/ui/test/Opa5";<% if (oDataEntitySet) { %>
import Control from "sap/ui/core/Control";
import Table from "sap/ui/table/Table";
import Label from "sap/m/Label";<% } else { %>
import Press from "sap/ui/test/actions/Press";<% } %>

const viewName = "<%= appId %>.view.Main";

export default class MainPage extends Opa5 {
	// Actions<% if (!oDataEntitySet) { %>
	iPressTheSayHelloWithDialogButton() {
		this.waitFor({
			id: "helloButton",
			viewName,
			actions: new Press(),
			errorMessage: "Did not find the 'Say Hello With Dialog' button on the Main view"
		});
	}

	iPressTheOkButtonInTheDialog() {
		this.waitFor({
			controlType: "sap.m.Button",
			searchOpenDialogs: true,
			viewName,
			actions: new Press(),
			errorMessage: "Did not find the 'OK' button in the Dialog"
		});
	}<% } else { %>
	iSelectFirstTableRow() {
		this.waitFor({
			controlType: "sap.ui.table.Table",
			viewName,
			actions: function (oTable: Table) {
				// Select the first row if available
				if (oTable.getRows().length > 0) {
					oTable.setSelectedIndex(0);
					oTable.fireRowSelectionChange({
						rowIndex: 0,
						rowContext: oTable.getRows()[0].getBindingContext(),
						userInteraction: true
					});
				}
			},
			errorMessage: "Did not find the data table"
		});
	}<% } %>

	// Assertions<% if (!oDataEntitySet) { %>
	iShouldSeeTheHelloDialog() {
		this.waitFor({
			controlType: "sap.m.Dialog",
			success: function () {
				// we set the view busy, so we need to query the parent of the app
				Opa5.assert.ok(true, "The dialog is open");
			},
			errorMessage: "Did not find the dialog control"
		});
	}

	iShouldNotSeeTheHelloDialog() {
		this.waitFor({
			controlType: "sap.m.App", // dummy, I just want a check function, where I can search the DOM. Probably there is a better way for a NEGATIVE test (NO dialog).
			check: function () {
				return document.querySelectorAll(".sapMDialog").length === 0;
			},
			success: function () {
				Opa5.assert.ok(true, "No dialog is open");
			}
		});
	}<% } else { %>
	iShouldSeeTheDataTable() {
		this.waitFor({
			controlType: "sap.ui.table.Table",
			viewName,
			success: function (aTables: Table[]) {
				Opa5.assert.ok(aTables.length > 0, "The data table is displayed");
			},
			errorMessage: "Did not find the data table"
		});
	}

	iShouldSeeTheDetailForm() {
		this.waitFor({
			id: "detailForm",
			viewName,
			success: function (oForm: Control) {
				Opa5.assert.ok(oForm, "The detail form is displayed");
			},
			errorMessage: "Did not find the detail form"
		});
	}

	iShouldSeeTableWithCorrectColumns() {
		this.waitFor({
			controlType: "sap.ui.table.Table",
			viewName,
			success: function (aTables: Table[]) {
				const oTable = aTables[0];
				const aColumns = oTable.getColumns();
				const expectedColumns = [<% entityProperties.forEach(function(property, index) { %>"<%= property %>"<% if (index < entityProperties.length - 1) { %>, <% } %><% }); %>];
				
				Opa5.assert.equal(aColumns.length, expectedColumns.length, "Table has the correct number of columns");
				
				for (let i = 0; i < expectedColumns.length; i++) {
					const sColumnText = (aColumns[i].getLabel() as Label).getText();
					Opa5.assert.equal(sColumnText, expectedColumns[i], `Column ${i} has correct label: ${expectedColumns[i]}`);
				}
			},
			errorMessage: "Table columns do not match expected properties"
		});
	}<% } %>
}
