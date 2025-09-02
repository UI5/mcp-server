import BaseController from "./BaseController";<% if (oDataEntitySet) { %><% if (gte1_115_0) { %>
import {Table$RowSelectionChangeEvent} from "sap/ui/table/Table";<% } else { %>
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/Context";<% } %><% } else { %>
import MessageBox from "sap/m/MessageBox";<% } %>

/**
 * @namespace <%= appId %>.controller
 */
export default class Main extends BaseController {<% if (!oDataEntitySet) { %>
	public sayHello(): void {
		MessageBox.show("Hello World!");
	}<% } else { %>

	onRowSelectionChange(oEvent: <% if (gte1_115_0) { %>Table$RowSelectionChangeEvent<% } else { %>Event<% } %>): void {
		const selectedContext = oEvent.getParameter("rowContext")<% if (!gte1_115_0) { %> as Context<% } %>;
		this.byId("detailForm").setBindingContext(selectedContext);
	}<% } %>
}
