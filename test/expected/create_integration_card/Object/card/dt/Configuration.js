sap.ui.define([
	"sap/ui/integration/Designtime",
],
function (
	Designtime
) {
	"use strict";

	return function () {
		return new Designtime({
			form: {
				items: {
					groupheader1: {
						label: "General Settings",
						type: "group",
					},
					separator1: {
						type: "separator",
					},
					title: {
						manifestpath: "/sap.card/header/title",
						type: "string",
						translatable: true,
						label: "Card Title",
						cols: 1,
						allowDynamicValues: true,
					},
					subtitle: {
						manifestpath: "/sap.card/header/subtitle",
						type: "string",
						translatable: true,
						label: "Card Subtitle",
						cols: 1,
						allowDynamicValues: true,
					},
				},
			},
			preview: {
				modes: "None",
			},
		});
	};
});