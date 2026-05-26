# UI Integration Cards Development Guidelines

> *This document outlines the fundamental rules and best practices an AI agent must follow when developing or modifying Integration Cards. Adherence to these guidelines is critical for creating modern, maintainable, and performant UI Integration Cards.*
## 1. Coding Guidelines
- **ALWAYS** strive to create declarative Integration Card, such as "Calendar", "List", "Table", "Timeline", "Object" or "Analytical".
  - create an Integration Card Extension only in exceptional cases.
- **ALWAYS** create links using the `actions` property.
- **ALWAYS** refer to parameters using correct syntax - `{parameters>/parameterKey/value}`.
- **ALWAYS** perform validation of the integration card as described in [2. Validation](#2-validation).
- **ALWAYS** show a preview of the generated card following the [4. Preview Instructions](#4-preview-instructions).
- **ALWAYS** generate new declarative integration cards using the `create_integration_card` tool.

### 1.1 Data
- **NEVER** modify the provided data under any circumstances.
- **ALWAYS** wrap every external service URL in a destination under `sap.card/configuration/destinations/` and reference it as `{{destinations.destinationName}}`.
- **NEVER** replace destination name with its URL.
- **ALWAYS** ensure that the endpoint behind `sap.card/data/request` returns JSON. For OData services, append `$format=json` to the request URL or parameters.
- **ALWAYS** place data configuration in: `"sap.card"/data/`
- **NEVER** place data configuration in:
  - `"sap.card"/content/data/`
  - `"sap.card"/header/data/`
- Data can be provided via:
  1. Inline JSON object
  2. Network request (HTTP/HTTPS/Destination)
  3. Extension method call
- **ALWAYS** verify these paths are correctly set:
  - `"sap.card"/data/path` (Primary data path)
  - `"sap.card"/content/data/path` (Content-specific path. It overrides the primary data path)
  - `"sap.card"/header/data/path` (Header-specific path. It overrides the primary data path)

#### 1.1.1 Data Errors Detection
- Symptom: "No data to display" message appears.
- Cause: Incorrect data configuration or data path in the content incorrectly overrides the primary data path.
- Solution: Verify all rules in [1.1 Data](#11-data) are properly followed.

### 1.2 Internationalization
- **ALWAYS** bind properties that are not bound to the data to the `i18n` model.

### 1.3 Analytical Cards
- **ALWAYS** follow [6. Analytical Cards Coding Guidelines](#6-analytical-cards-coding-guidelines) when developing Analytical cards.

### 1.4 Configuration Editor
- **ALWAYS** follow [5. Configuration Editor](#5-configuration-editor) guidelines when creating or modifying Configuration Editors for Integration Cards.

## 2. Validation
- **ALWAYS** ensure that `manifest.json` file is valid JSON.
- **ALWAYS** ensure that in `manifest.json` file the property `sap.app/type` is set to `"card"`.
- **ALWAYS** validate the `manifest.json` against the UI5 Manifest schema. Use the `run_manifest_validation` tool to do this.
- **ALWAYS** avoid using deprecated properties in `manifest.json` and elsewhere.
- **NEVER** treat Integration Cards' project as UI5 project, except for cards of type "Component".

## 3. Card Explorer
- The Card Explorer provides detailed documentation for the Integration Cards schema, including descriptions of every property, guidance for integrating cards into hosting environments, configuration editor documentation with examples, and broader best practices. It is available at: https://ui5.sap.com/test-resources/sap/ui/integration/demokit/cardExplorer/webapp/index.html

## 4. Preview Instructions
- If preview of the card must be shown, **ALWAYS** check the card folder for an existing preview file and any accompanying instructions or scripts, and reuse them if available.
  * for example, in NodeJS-based projects, search the `package.json` file for `start` or similar script. If such is available, use it
  * also search in the `README.md` file.
- If preview instructions are not available, you have to create an HTML page that contains a `ui-integration` card element which references the card manifest. Then serve the HTML page using `http` server.

## 5. Configuration Editor
Configuration Editor allows different personas to customize Integration Cards without modifying the manifest file directly.
The following roles/personas are supported:
- Administrator
- Page/Content Administrator
- Translator

The Configuration Editor is implemented through two key components:

1. **Definition file**: Create a `dt/Configuration.js` file that exports a Designtime definition object
2. **Manifest reference**: Reference this definition in the `manifest.json` under the `sap.card/configuration/editor` property

The `dt/Configuration.js` file defines the Configuration Editor's structure by specifying:
- Form layout and field definitions
- Input controls and visualizations 
- Validation rules and field relationships
- Grouping and organization of configuration options

When creating or modifying Integration Cards, follow these guidelines for Configuration Editors:
- Assume the role of Administrator persona when designing the Configuration Editor.
- **ALWAYS** ensure that the Configuration Editor reflects the current structure and fields of the `manifest.json`. The `manifestpath` of an editor field can target any existing path in the `manifest.json` — a `configuration/parameters/*/value` for parameterized fields, or a direct path like `/sap.card/header/icon/shape` for static manifest properties.
- **ALWAYS** make the existing fields in the `manifest.json` configurable via the editor. For example manifest parameters, title, subtitle, icon of the header, etc.
- **NEVER** add fields to the editor that do not exist in the `manifest.json`.
- **ALWAYS** remove fields from the editor when removing them from the `manifest.json`.
- **ALWAYS** add fields in the Configuration Editor when adding them to the `manifest.json`.

### 5.1 Example:
This reference shows a complete pairing of a `manifest.json` and the corresponding `dt/Configuration.js` file for an Integration Card with a Configuration Editor.

`manifest.json` file:
```json
{
  "sap.app": {
    "id": "test.editor",
    "type": "card",
    "title": "Test Card",
    "applicationVersion": {
      "version": "1.0.0"
    }
  },
  "sap.ui": {
    "technology": "UI5"
  },
  "sap.card": {
    "type": "List",
    "configuration": {
      "editor": "./dt/Configuration",
      "parameters": {
        "cardTitle": {
          "value": "Customers"
        },
        "icon": {
          "value": "sap-icon://account"
        },
        "maxItems": {
          "value": 3
        },
        "showDescription": {
          "value": true
        },
        "dateContext": {
          "value": "2020-09-02"
        },
        "Customer": {
          "value": "ALFKI"
        },
        "northwindDestination": {
          "value": "northwind"
        }
      },
      "destinations": {
        "northwind": {
          "name": "Northwind_V4",
          "defaultUrl": "https://services.odata.org/V4/Northwind/Northwind.svc"
        }
      }
    },
    "data": {
      "request": {
        "url": "{{destinations.northwind}}/Customers",
        "parameters": {
          "$select": "CustomerID,CompanyName,ContactName",
          "$top": "{parameters>/maxItems/value}"
        }
      }
    },
    "header": {
      "title": "{parameters>/cardTitle/value}",
      "subtitle": "As of {parameters>/dateContext/value}",
      "icon": {
        "src": "{parameters>/icon/value}",
        "shape": "Circle",
        "backgroundColor": "Transparent"
      }
    },
    "content": {
      "data": {
        "path": "/value"
      },
      "item": {
        "title": "{CompanyName}",
        "description": "{= ${parameters>/showDescription/value} ? ${ContactName} : '' }"
      },
      "maxItems": "{parameters>/maxItems/value}"
    }
  }
}
```

`dt/Configuration.js` file:
```javascript
sap.ui.define(["sap/ui/integration/Designtime"], function (Designtime) {
	"use strict";

	return function () {
		return new Designtime({
			form: {
				items: {

					/* =======================
					   General
					======================= */
					generalGroup: {
						type: "group",
						label: "General"
					},

					cardTitle: {
						manifestpath: "/sap.card/configuration/parameters/cardTitle/value",
						type: "string",
						label: "Card Title",
						translatable: true,
						required: true,
						allowDynamicValues: true
					},

					icon: {
						manifestpath: "/sap.card/configuration/parameters/icon/value",
						type: "string",
						label: "Icon",
						visualization: {
							type: "IconSelect",
							settings: {
								value: "{currentSettings>value}",
								editable: "{currentSettings>editable}"
							}
						}
					},

					iconShape: {
						manifestpath: "/sap.card/header/icon/shape",
						type: "string",
						label: "Icon Shape",
						visualization: {
							type: "ShapeSelect",
							settings: {
								value: "{currentSettings>value}",
								editable: "{currentSettings>editable}"
							}
						},
						cols: 1
					},

					iconBackground: {
						manifestpath: "/sap.card/header/icon/backgroundColor",
						type: "string",
						label: "Icon Background",
						visualization: {
							type: "ColorSelect",
							settings: {
								enumValue: "{currentSettings>value}",
								editable: "{currentSettings>editable}"
							}
						},
						cols: 1
					},

					/* =======================
					   Data & Behavior
					======================= */
					dataGroup: {
						type: "group",
						label: "Data & Behavior"
					},

					maxItems: {
						manifestpath: "/sap.card/configuration/parameters/maxItems/value",
						type: "integer",
						label: "Maximum Items",
						visualization: {
							type: "Slider",
							settings: {
								value: "{currentSettings>value}",
								min: 1,
								max: 10,
								width: "100%",
								enabled: "{currentSettings>editable}"
							}
						}
					},

					showDescription: {
						manifestpath: "/sap.card/configuration/parameters/showDescription/value",
						type: "boolean",
						label: "Show Contact Name",
						visualization: {
							type: "Switch",
							settings: {
								state: "{currentSettings>value}",
								customTextOn: "Show",
								customTextOff: "Hide",
								enabled: "{currentSettings>editable}"
							}
						}
					},

					dateContext: {
						manifestpath: "/sap.card/configuration/parameters/dateContext/value",
						type: "date",
						label: "Date Context"
					},

					/* =======================
					   Filtering
					======================= */
					filterGroup: {
						type: "group",
						label: "Customer Filter"
					},

					Customer: {
						manifestpath: "/sap.card/configuration/parameters/Customer/value",
						type: "string",
						label: "Customer ID",
						values: {
							data: {
								request: {
									url: "{{destinations.northwind}}/Customers",
									parameters: {
										"$select": "CustomerID,CompanyName"
									}
								},
								path: "/value"
							},
							item: {
								key: "{CustomerID}",
								text: "{CompanyName}"
							}
						}
					}
				}
			},
			preview: {
				modes: "None"
			}
		});
	};
});

```

## 6. Analytical Cards Coding Guidelines
- **ALWAYS** set `sap.card/content/chartType` property.
- **ALWAYS** adjust `sap.card/content/measures`, `sap.card/content/dimensions` and `sap.card/content/feeds` to match the `sap.card/content/chartType` property and data structure. This is critical for proper data display.
- **ALWAYS** use `sap.card/content/chartProperties` to adjust labels, colors, the legend, and other chart aspects.
- **ALWAYS** define each feed with its type (Dimension or Measure), its unique identifier (uid), and the associated values using defined measures and dimensions. Example:
```json
"feeds": [
  {
    "type": "Dimension",
    "uid": "color",
    "values": [
      "Store Name"
    ]
  },
  {
    "type": "Measure",
    "uid": "size",
    "values": [
      "Revenue"
    ]
  }
]
```
- **ALWAYS** ensure the `uid` in `feeds` exactly matches the UID required for the selected chartType (e.g., color, size, dataFrame).

### 6.1 Comprehensive List of All Chart Types, UIDs and Examples

1. donut/pie
    * UIDs: size, color, dataFrame
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueDataField}"
            }
          ],
          "dimensions": [
            {
              "name": "Product Category",
              "value": "{productCategoryField}"
            }
          ],
          "feeds": [
            {
              "type": "Measure",
              "uid": "size",
              "values": ["Revenue"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Product Category"]
            }
          ]
        }
        ```

2. heatmap
    * UIDs: categoryAxis, categoryAxis2, color
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Temperature",
              "value": "{temperatureField}"
            }
          ],
          "dimensions": [
            {
              "name": "Location",
              "value": "{locationField}"
            },
            {
              "name": "Product",
              "value": "{productField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Location"]
            },
            {
              "type": "Dimension",
              "uid": "categoryAxis2",
              "values": ["Product"]
            },
            {
              "type": "Measure",
              "uid": "color",
              "values": ["Temperature"]
            }
          ]
        }
        ```

3. treemap
    * UIDs: title, color, weight
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Profit",
              "value": "{profitField}"
            },
            {
              "name": "Budget",
              "value": "{budgetField}"
            }
          ],
          "dimensions": [
            {
              "name": "Department",
              "value": "{departmentField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "title",
              "values": ["Department"]
            },
            {
              "type": "Measure",
              "uid": "color",
              "values": ["Profit"]
            },
            {
              "type": "Measure",
              "uid": "weight",
              "values": ["Budget"]
            }
          ]
        }
        ```

4. bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales",
              "value": "{salesField}"
            }
          ],
          "dimensions": [
            {
              "name": "Month",
              "value": "{monthField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Month"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Sales"]
            }
          ]
        }
        ```

5. dual_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Expenses",
              "value": "{expensesField}"
            }
          ],
          "dimensions": [
            {
              "name": "Quarter",
              "value": "{quarterField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Quarter"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Expenses"]
            }
          ]
        }
        ```

6. column
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Month",
              "value": "{monthField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Month"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            }
          ]
        }
        ```

7. timeseries_column
    * UIDs: timeAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Traffic",
              "value": "{trafficField}"
            }
          ],
          "dimensions": [
            {
              "name": "Date",
              "value": "{dateField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Date"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Traffic"]
            }
          ]
        }
        ```

8. dual_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Costs",
              "value": "{costsField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Region"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Costs"]
            }
          ]
        }
        ```

9. stacked_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain bar
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            },
            {
              "name": "Product",
              "value": "{productField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Region"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Product"]
            }
          ]
        }
        ```

10. stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain column
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Market Share",
              "value": "{marketShareField}"
            }
          ],
          "dimensions": [
            {
              "name": "Sector",
              "value": "{sectorField}"
            },
            {
              "name": "Product",
              "value": "{productField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Sector"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Market Share"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Product"]
            }
          ]
        }
        ```

11. timeseries_stacked_column
    * UIDs: timeAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain timeseries_column
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Investment",
              "value": "{investmentField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            },
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Investment"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Sector"]
            }
          ]
        }
        ```

12. 100_stacked_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain bar
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Costs",
              "value": "{costsField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            },
            {
              "name": "Category",
              "value": "{categoryField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Region"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Costs"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Category"]
            }
          ]
        }
        ```

13. 100_stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain column
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Market Share",
              "value": "{marketShareField}"
            }
          ],
          "dimensions": [
            {
              "name": "Product",
              "value": "{productField}"
            },
            {
              "name": "Region",
              "value": "{regionField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Product"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Market Share"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Region"]
            }
          ]
        }
        ```

14. timeseries_100_stacked_column
    * UIDs: timeAxis, color, valueAxis
    * Note: Stacking requires a second dimension fed to `color`; without it the chart renders as a plain timeseries_column
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Investment",
              "value": "{investmentField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            },
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Investment"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Sector"]
            }
          ]
        }
        ```

15. dual_stacked_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Profit",
              "value": "{profitField}"
            }
          ],
          "dimensions": [
            {
              "name": "Brand",
              "value": "{brandField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Brand"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Profit"]
            }
          ]
        }
        ```

16. dual_stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Growth",
              "value": "{growthField}"
            },
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Sector"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Growth"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Revenue"]
            }
          ]
        }
        ```

17. 100_dual_stacked_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales",
              "value": "{salesField}"
            },
            {
              "name": "Growth",
              "value": "{growthField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Region"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Sales"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Growth"]
            }
          ]
        }
        ```

18. 100_dual_stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales",
              "value": "{salesField}"
            },
            {
              "name": "Growth",
              "value": "{growthField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Region"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Sales"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Growth"]
            }
          ]
        }
        ```

19. line
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Price",
              "value": "{priceField}"
            }
          ],
          "dimensions": [
            {
              "name": "Time",
              "value": "{timeField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Time"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Price"]
            }
          ]
        }
        ```

20. dual_line
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Price",
              "value": "{priceField}"
            },
            {
              "name": "Volume",
              "value": "{volumeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Time",
              "value": "{timeField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Time"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Price"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Volume"]
            }
          ]
        }
        ```

21. timeseries_line
    * UIDs: timeAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Temperature",
              "value": "{temperatureField}"
            }
          ],
          "dimensions": [
            {
              "name": "Date",
              "value": "{dateField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Date"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Temperature"]
            }
          ]
        }
        ```

22. bubble
    * UIDs: dataFrame, color, shape, valueAxis, valueAxis2, bubbleWidth
    * Note: Requires at least 3 measures (for valueAxis, valueAxis2, and bubbleWidth)
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expansion",
              "value": "{expansionField}"
            },
            {
              "name": "Cost",
              "value": "{costField}"
            },
            {
              "name": "Size",
              "value": "{sizeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Expansion"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Cost"]
            },
            {
              "type": "Measure",
              "uid": "bubbleWidth",
              "values": ["Size"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Sector"]
            }
          ]
        }
        ```

23. time_bubble
    * UIDs: dataFrame, color, shape, valueAxis, valueAxis2, bubbleWidth, timeAxis
    * Note: Requires timeAxis dimension, at least 2 measures (for valueAxis and bubbleWidth), and a color dimension
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expansion",
              "value": "{expansionField}"
            },
            {
              "name": "Growth",
              "value": "{growthField}"
            },
            {
              "name": "Size",
              "value": "{sizeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            },
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Expansion"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Growth"]
            },
            {
              "type": "Measure",
              "uid": "bubbleWidth",
              "values": ["Size"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Sector"]
            }
          ]
        }
        ```

24. timeseries_bubble
    * UIDs: color, shape, valueAxis, timeAxis, bubbleWidth
    * Note: Requires timeAxis dimension with dataType "date", bubbleWidth measure, and valueAxis measure
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Size",
              "value": "{sizeField}"
            },
            {
              "name": "Performance",
              "value": "{performanceField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            },
            {
              "name": "Sector",
              "value": "{sectorField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "bubbleWidth",
              "values": ["Size"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Sector"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Performance"]
            }
          ]
        }
        ```

25. scatter
    * UIDs: dataFrame, color, shape, valueAxis, valueAxis2
    * Note: Requires 2 measures for valueAxis and valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Efficiency",
              "value": "{efficiencyField}"
            },
            {
              "name": "Cost",
              "value": "{costField}"
            }
          ],
          "dimensions": [
            {
              "name": "Region",
              "value": "{regionField}"
            }
          ],
          "feeds": [
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Efficiency"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Cost"]
            },
            {
              "type": "Dimension",
              "uid": "color",
              "values": ["Region"]
            }
          ]
        }
        ```

26. timeseries_scatter
    * UIDs: color, shape, valueAxis, timeAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Performance",
              "value": "{performanceField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Performance"]
            }
          ]
        }
        ```

27. area
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Score",
              "value": "{scoreField}"
            }
          ],
          "dimensions": [
            {
              "name": "Competency",
              "value": "{competencyField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Competency"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Score"]
            }
          ]
        }
        ```

28. radar
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Proficiency Level",
              "value": "{proficiencyField}"
            }
          ],
          "dimensions": [
            {
              "name": "Skill",
              "value": "{skillField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Skill"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Proficiency Level"]
            }
          ]
        }
        ```

29. vertical_bullet
    * UIDs: categoryAxis, color, actualValues, additionalValues, targetValues, forecastValues
    * Note: `targetValues` expects a measure (target value), not a dimension
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Achievement",
              "value": "{achievementField}"
            },
            {
              "name": "Target",
              "value": "{targetField}"
            }
          ],
          "dimensions": [
            {
              "name": "KPI Name",
              "value": "{kpiNameField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["KPI Name"]
            },
            {
              "type": "Measure",
              "uid": "actualValues",
              "values": ["Achievement"]
            },
            {
              "type": "Measure",
              "uid": "targetValues",
              "values": ["Target"]
            }
          ]
        }
        ```

30. bullet
    * UIDs: categoryAxis, color, actualValues, additionalValues, targetValues, forecastValues
    * Note: `targetValues` expects a measure (target value), not a dimension
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Achievement",
              "value": "{achievementField}"
            },
            {
              "name": "Target",
              "value": "{targetField}"
            }
          ],
          "dimensions": [
            {
              "name": "KPI Name",
              "value": "{kpiNameField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["KPI Name"]
            },
            {
              "type": "Measure",
              "uid": "actualValues",
              "values": ["Achievement"]
            },
            {
              "type": "Measure",
              "uid": "targetValues",
              "values": ["Target"]
            }
          ]
        }
        ```

31. timeseries_bullet
    * UIDs: timeAxis, color, actualValues, additionalValues, targetValues
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales",
              "value": "{salesField}"
            }
          ],
          "dimensions": [
            {
              "name": "Date",
              "value": "{dateField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Date"]
            },
            {
              "type": "Measure",
              "uid": "actualValues",
              "values": ["Sales"]
            }
          ]
        }
        ```

32. waterfall
    * UIDs: categoryAxis, waterfallType, valueAxis
    * Note: `waterfallType` is optional but recommended; it distinguishes total bars from running positive/negative changes
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Change",
              "value": "{changeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Phase",
              "value": "{phaseField}"
            },
            {
              "name": "Type",
              "value": "{typeField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Phase"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Change"]
            },
            {
              "type": "Dimension",
              "uid": "waterfallType",
              "values": ["Type"]
            }
          ]
        }
        ```

33. timeseries_waterfall
    * UIDs: timeAxis, valueAxis, color
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Financial Change",
              "value": "{financialChangeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Financial Change"]
            }
          ]
        }
        ```

34. horizontal_waterfall
    * UIDs: categoryAxis, waterfallType, valueAxis
    * Note: `waterfallType` is optional but recommended; it distinguishes total bars from running positive/negative changes
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Growth",
              "value": "{growthField}"
            }
          ],
          "dimensions": [
            {
              "name": "Milestone",
              "value": "{milestoneField}"
            },
            {
              "name": "Type",
              "value": "{typeField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Milestone"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Growth"]
            },
            {
              "type": "Dimension",
              "uid": "waterfallType",
              "values": ["Type"]
            }
          ]
        }
        ```

35. combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Requires at least 2 measures in the valueAxis feed for proper rendering
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expense",
              "value": "{expenseField}"
            },
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Period",
              "value": "{periodField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Period"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Expense", "Revenue"]
            }
          ]
        }
        ```

36. stacked_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Requires at least 2 measures in the valueAxis feed for proper rendering
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Sales",
              "value": "{salesField}"
            }
          ],
          "dimensions": [
            {
              "name": "Category",
              "value": "{categoryField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Category"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue", "Sales"]
            }
          ]
        }
        ```

37. horizontal_stacked_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Note: Requires at least 2 measures in the valueAxis feed for proper rendering
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Growth",
              "value": "{growthField}"
            },
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Product",
              "value": "{productField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Product"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Growth", "Revenue"]
            }
          ]
        }
        ```

38. dual_stacked_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Costs",
              "value": "{costsField}"
            }
          ],
          "dimensions": [
            {
              "name": "Time Period",
              "value": "{timePeriodField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Time Period"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Costs"]
            }
          ]
        }
        ```

39. dual_horizontal_stacked_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales",
              "value": "{salesField}"
            },
            {
              "name": "Returns",
              "value": "{returnsField}"
            }
          ],
          "dimensions": [
            {
              "name": "Brand",
              "value": "{brandField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Brand"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Sales"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Returns"]
            }
          ]
        }
        ```

40. dual_horizontal_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Engagement",
              "value": "{engagementField}"
            },
            {
              "name": "Spend",
              "value": "{spendField}"
            }
          ],
          "dimensions": [
            {
              "name": "Campaign",
              "value": "{campaignField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Campaign"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Engagement"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Spend"]
            }
          ]
        }
        ```

41. dual_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Sales Revenue",
              "value": "{salesRevenueField}"
            },
            {
              "name": "Operating Cost",
              "value": "{operatingCostField}"
            }
          ],
          "dimensions": [
            {
              "name": "Time Frame",
              "value": "{timeFrameField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Time Frame"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Sales Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Operating Cost"]
            }
          ]
        }
        ```

42. timeseries_combination
    * UIDs: timeAxis, color, valueAxis
    * Note: Requires at least 2 measures in the valueAxis feed for proper rendering
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Earnings",
              "value": "{earningsField}"
            },
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Month",
              "value": "{monthField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Month"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Earnings", "Revenue"]
            }
          ]
        }
        ```

43. dual_timeseries_combination
    * UIDs: timeAxis, color, valueAxis, valueAxis2
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Revenue",
              "value": "{revenueField}"
            },
            {
              "name": "Cost",
              "value": "{costField}"
            }
          ],
          "dimensions": [
            {
              "name": "Month",
              "value": "{monthField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Month"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Revenue"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis2",
              "values": ["Cost"]
            }
          ]
        }
        ```

44. timeseries_stacked_combination
    * UIDs: timeAxis, color, valueAxis
    * Note: Requires at least 2 measures in the valueAxis feed for proper rendering
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Performance",
              "value": "{performanceField}"
            },
            {
              "name": "Revenue",
              "value": "{revenueField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}",
              "dataType": "date"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "timeAxis",
              "values": ["Year"]
            },
            {
              "type": "Measure",
              "uid": "valueAxis",
              "values": ["Performance", "Revenue"]
            }
          ]
        }
        ```