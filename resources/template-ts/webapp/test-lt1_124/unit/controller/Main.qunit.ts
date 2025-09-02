import Main from "<%= appURI %>/controller/Main.controller";

QUnit.module("Sample Main controller test");

QUnit.test("The Main controller class has a <% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %> method", function (assert) {
	// as a very basic test example just check the presence of the "<% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %>" method
	assert.strictEqual(typeof Main.prototype.<% if (!oDataEntitySet) { %>sayHello<% } else { %>onRowSelectionChange<% } %>, "function");
});
