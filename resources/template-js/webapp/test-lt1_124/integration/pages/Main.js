sap.ui.define(["sap/ui/test/Opa5"<% if (!oDataEntitySet) { %>, "sap/ui/test/actions/Press"<% } %>], function (Opa5<% if (!oDataEntitySet) { %>, Press<% } %>) {
	"use strict";

	Opa5.createPageObjects({
		onTheMainPage: {
			actions: {<% if (!oDataEntitySet) { %>
				iPressTheSayHelloButton: function () {
					return this.waitFor({
						id: "helloButton",
						viewName: "<%= appId %>.view.Main",
						actions: new Press(),
						errorMessage: "Did not find the 'Say Hello With Dialog' button on the App view"
					});
				},

				iPressTheOkButtonInTheDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Button",
						searchOpenDialogs: true,
						viewName: "<%= appId %>.view.Main",
						actions: new Press(),
						errorMessage: "Did not find the 'OK' button in the Dialog"
					});
				}<% } else { %>
				iSelectFirstTableRow: function () {
					return this.waitFor({
						controlType: "sap.ui.table.Table",
						viewName: "<%= appId %>.view.Main",
						actions: function (oTable) {
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
			},

			assertions: {<% if (!oDataEntitySet) { %>
				iShouldSeeTheHelloDialog: function () {
					return this.waitFor({
						controlType: "sap.m.Dialog",
						success: function () {
							// we set the view busy, so we need to query the parent of the app
							Opa5.assert.ok(true, "The dialog is open");
						},
						errorMessage: "Did not find the dialog control"
					});
				},

				iShouldNotSeeTheHelloDialog: function () {
					return this.waitFor({
						controlType: "sap.m.App", // dummy, I just want a check function, where I can search the DOM. Probably there is a better way for a NEGATIVE test (NO dialog).
						check: function () {
							return document.querySelectorAll(".sapMDialog").length === 0;
						},
						success: function () {
							Opa5.assert.ok(true, "No dialog is open");
						}
					});
				}<% } else { %>
				iShouldSeeTheDataTable: function () {
					return this.waitFor({
						controlType: "sap.ui.table.Table",
						viewName: "<%= appId %>.view.Main",
						success: function (aTables) {
							Opa5.assert.ok(aTables.length > 0, "The data table is displayed");
						},
						errorMessage: "Did not find the data table"
					});
				},

				iShouldSeeTheDetailForm: function () {
					return this.waitFor({
						id: "detailForm",
						viewName: "<%= appId %>.view.Main",
						success: function (oForm) {
							Opa5.assert.ok(oForm, "The detail form is displayed");
						},
						errorMessage: "Did not find the detail form"
					});
				},

				iShouldSeeTableWithCorrectColumns: function () {
					return this.waitFor({
						controlType: "sap.ui.table.Table",
						viewName: "<%= appId %>.view.Main",
						success: function (aTables) {
							const oTable = aTables[0];
							const aColumns = oTable.getColumns();
							const expectedColumns = [<% entityProperties.forEach(function(property, index) { %>"<%= property %>"<% if (index < entityProperties.length - 1) { %>, <% } %><% }); %>];
							
							Opa5.assert.equal(aColumns.length, expectedColumns.length, "Table has the correct number of columns");
							
							for (let i = 0; i < expectedColumns.length; i++) {
								const sColumnText = aColumns[i].getLabel().getText();
								Opa5.assert.equal(sColumnText, expectedColumns[i], "Column " + i + " has correct label: " + expectedColumns[i]);
							}
						},
						errorMessage: "Table columns do not match expected properties"
					});
				}<% } %>
			}
		}
	});
});
