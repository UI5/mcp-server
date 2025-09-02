/* global QUnit */
sap.ui.define(["<%= appURI %>/controller/Main.controller"], function (MainController) {
	"use strict";

	QUnit.module("Sample Main controller test");

	QUnit.test("The MainController class has a <% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %> method", function (assert) {
		// as a very basic test example just check the presence of the "<% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %>" method
		assert.strictEqual(typeof MainController.prototype.<% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %>, "function");
	});
});
