sap.ui.define(["./BaseController"<% if (!oDataEntitySet) { %>, "sap/m/MessageBox"<% } %>], function (BaseController<% if (!oDataEntitySet) { %>, MessageBox<% } %>) {
	"use strict";

	return BaseController.extend("<%= appId %>.controller.Main", {<% if (!oDataEntitySet) { %>
		sayHello: function () {
			MessageBox.show("Hello World!");
		}<% } else { %>

		onRowSelectionChange: function(oEvent) {
			const selectedContext = oEvent.getParameter("rowContext");
			this.byId("detailForm").setBindingContext(selectedContext);
		}<% } %>
	});
});
