sap.ui.define(["sap/ui/integration/Host"], async (Host) => {
	"use strict";
	await customElements.whenDefined("ui-integration-card");
	await customElements.whenDefined("ui-integration-card-editor");

	const editor = document.getElementById("editor");
	const card = document.getElementById("card");
	const applyChangesBtn = document.getElementById("applyChangesBtn");
	const resetBtn = document.getElementById("resetBtn");
	const destinations = {
	};
	const host = new Host({
		resolveDestination: function(destinationName) {
			if (destinations[destinationName]) {
				return destinations[destinationName];
			}

			return Promise.reject("Destination " + destinationName + " not found!");
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

	// Called by the Configuration Editor to show a list of available destinations
	host.getDestinations = function() {
		return Promise.resolve(Object.entries(destinations).map(([name, url]) => {
			return {
				name,
			};
		}));
	};

	card.host = host.getId();
	card.manifest = "../card/manifest.json";

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