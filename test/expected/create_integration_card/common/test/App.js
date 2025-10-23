sap.ui.define(["sap/ui/integration/Host"], async (Host) => {
	"use strict";
	await customElements.whenDefined("ui-integration-card");
	await customElements.whenDefined("ui-integration-card-editor");

	const editor = document.getElementById("editor");
	const card = document.getElementById("card");
	const applyChangesBtn = document.getElementById("applyChangesBtn");
	const resetBtn = document.getElementById("resetBtn");
	const host = new Host({
		resolveDestination: function(sDestinationName) {
			if (sDestinationName === "Northwind") {
				return "https://services.odata.org/V4/Northwind/Northwind.svc/";
			}

			throw new Error("Destination " + sDestinationName + " not found!");
		},
		actions: [
			{
				type: "Custom",
				text: "Configure",
				icon: "sap-icon://action-settings",
				action: () => {
					document.getElementById("editorSection").classList.remove("hidden");
				}
			}
		]
	});

	card.host = host.getId();
	card.manifest = "../src/manifest.json";

	editor.host = host.getId();
	editor.card = "card";

	let initialSettings;

	// UI5 CustomElementBase doesn't expose the "ready" event, so use timeout
	setTimeout(() => {
		initialSettings = editor.getCurrentSettings();
	}, 3000);

	applyChangesBtn.addEventListener("click", () => {
		card.manifestChanges = [editor.getCurrentSettings()];
	});

	resetBtn.addEventListener("click", () => {
		card.manifestChanges = [initialSettings];
	});
});