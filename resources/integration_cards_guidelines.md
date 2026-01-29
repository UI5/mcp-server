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
- **ALWAYS** include the service URL directly in the card manifest when one is supplied.
- **ALWAYS** reference destinations by name when available. Configure the destination in the `sap.card/configuration/destinations/` and reuse it with binding syntax like `{{destinations.destinationName}}`.
- **NEVER** replace destination name with its URL.
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

Configuration Editor is usually defined in the "dt/Configuration.js" file and referenced in the manifest file under `sap.card/configuration/editor` property.

When creating or modifying Integration Cards, follow these guidelines for Configuration Editors:
- Assume the role of Administrator persona when designing the Configuration Editor.
- **ALWAYS** ensure that the Configuration Editor reflects the current structure and fields of the `manifest.json`.
- **ALWAYS** make the existing fields in the `manifest.json` configurable via the editor. For example manifest parameters, title, subtitle, icon of the header, etc.
- **NEVER** add fields to the editor that do not exist in the `manifest.json`.
- **ALWAYS** remove fields from the editor when removing them from the `manifest.json`.
- **ALWAYS** add fields in the Configuration Editor when adding them to the `manifest.json`.

### 5.1 Example:
`manifest.json` file:
```javascript
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
                    "value": "Card Title Default"
                },
                "string": {
                    "value": "StringValue"
                },
                "stringWithTranslatedValue": {
                    "value": "{{TRANSLATED_STRING_VALUE}}"
                },
                "stringWithTranslatedValueIni18nFormat": {
                    "value": "{i18n>TRANSLATED_STRING_VALUE}"
                },
                "stringInCols1": {
                    "value": "stringInCols1"
                },
                "stringInCols2": {
                    "value": ""
                },
                "integer": {
                    "value": 1
                },
                "integerLabel": {
                    "value": 1
                },
                "number": {
                    "value": 1.5
                },
                "boolean": {
                    "value": false
                },
                "booleanLabel": {
                    "value": true
                },
                "date": {
                    "value": "2020-09-02"
                },
                "dateTime": {
                    "value": "2020-09-02T11:21:51.470Z"
                },
                "enum": {
                    "value": "Option B"
                },
                "stringWithStaticList": {
                    "value": "key1"
                },
                "stringWithRequestList": {
                    "value": "key1"
                },
                "stringWithRequestDestinationList": {
                    "value": ""
                },
                "string_Select": {
                    "value": "key2"
                },
                "stringArray": {
                    "value": [
                        "key1",
                        "key2"
                    ]
                },
                "stringArrayNoValues": {
                    "value": [
                        "key1",
                        "key2"
                    ]
                },
                "Customers": {
                    "value": [
                        "ALFKI"
                    ]
                },
                "iconNotAllowFile": {
                    "value": "sap-icon://account"
                },
                "stringDependent": {
                    "value": "visible"
                },
                "dependentString1": {
                    "value": "Editable changes depend on string1"
                },
                "integerDependent": {
                    "value": 3
                },
                "dependentInteger1": {
                    "value": "Editable changes depend on integer1"
                },
                "booleanDependent": {
                    "value": true
                },
                "dependentBoolean1": {
                    "value": "Editable changes depend on boolean1"
                }
            },
            "destinations": {
                "northwind": {
                    "name": "Northwind_V4",
                    "defaultUrl": "https://services.odata.org/V4/Northwind/Northwind.svc"
                },
                "Northwind_V3": {
                    "name": "Northwind_V3",
                    "defaultUrl": "https://services.odata.org/V4/Northwind/Northwind.svc"
                }
            }
        },
        "header": {
            "title": "{parameters>/cardTitle/value}",
            "subtitle": "Card Sub Title",
            "icon": {
                "src": "sap-icon://accept",
                "shape": "Circle",
                "backgroundColor": ""
            }
        },
        "content": {
            "data": {
                "json": [
                   
                ],
                "path": "/"
            },
            "item": {
                "title": "{Name}",
                "description": "{Description}"
            },
            "maxItems": 3
        }
    }
}
```

`dt/Configuration.js` file:
```javascript
sap.ui.define(["sap/ui/integration/Designtime"], function (
	Designtime
) {
	"use strict";
	return function () {
		return new Designtime({
			"form": {
				"items": {
					"generalGroup": {
						"type": "group",
						"label": "General",
						"hint": "Please refer to the <a href='https://www.sap.com'>documentation</a> lets see how this will behave if the text is wrapping to the next line and has <a href='https://www.sap.com'>two links</a>. good?"
					},
					"cardTitle": {
						"manifestpath": "/sap.card/configuration/parameters/cardTitle/value",
						"type": "string",
						"translatable": true,
						"required": true,
						"allowDynamicValues": true,
						"editableToUser": false,
						"visibleToUser": false
					},
					"separator1": {
						"type": "separator"
					},
					"string": {
						"manifestpath": "/sap.card/configuration/parameters/string/value",
						"type": "string",
						"label": "String Label",
						"translatable": true,
						"required": true,
						"editableToUser": false
					},
					"stringWithTranslatedValue": {
						"manifestpath": "/sap.card/configuration/parameters/stringWithTranslatedValue/value",
						"type": "string",
						"label": "{i18n>TRANSLATED_STRING_LABEL}",
						"translatable": true,
						"allowDynamicValues": false
					},
					"stringWithTranslatedValueIni18nFormat": {
						"manifestpath": "/sap.card/configuration/parameters/stringWithTranslatedValueIni18nFormat/value",
						"type": "string",
						"label": "String with translated value in i18n format",
						"description": "A very long description text that should wrap into the next line"
					},
					"separator2": {
						"type": "separator"
					},
					"stringInCols1": {
						"manifestpath": "/sap.card/configuration/parameters/stringInCols1/value",
						"label": "Column 1",
						"description": "Two columns in the same line",
						"type": "string",
						"cols": 1,
						"allowSettings": false,
						"translatable": true
					},
					"stringInCols2": {
						"manifestpath": "/sap.card/configuration/parameters/stringInCols2/value",
						"label": "Column 2",
						"type": "string",
						"cols": 1,
						"allowSettings": false
					},
					"separator3": {
						"type": "separator"
					},
					"integerLabel": {
						"manifestpath": "/sap.card/configuration/parameters/integerLabel/value",
						"type": "integer",
						"label": "Direct Integer Label"
					},
					"integer": {
						"manifestpath": "/sap.card/configuration/parameters/integer/value",
						"type": "integer",
						"label": "Integer with Slider",
						"visualization": {
							"type": "Slider",
							"settings": {
								"value": "{currentSettings>value}",
								"min": 0,
								"max": 10,
								"width": "100%",
								"showAdvancedTooltip": true,
								"showHandleTooltip": false,
								"inputsAsTooltips": true,
								"enabled": "{currentSettings>editable}"
							}
						}
					},
					"separator4": {
						"type": "separator"
					},
					"number": {
						"manifestpath": "/sap.card/configuration/parameters/number/value",
						"type": "number",
						"label": "{i18n>TRANSLATED_NUMBER_LABEL}"
					},
					"separator5": {
						"type": "separator"
					},
					"booleanLabel": {
						"manifestpath": "/sap.card/configuration/parameters/booleanLabel/value",
						"label": "Boolean",
						"type": "boolean"
					},
					"boolean": {
						"manifestpath": "/sap.card/configuration/parameters/boolean/value",
						"description": "Description",
						"label": "Boolean with Switch",
						"type": "boolean",
						"visualization": {
							"type": "Switch",
							"settings": {
								"state": "{currentSettings>value}",
								"customTextOn": "Yes",
								"customTextOff": "No",
								"enabled": "{currentSettings>editable}"
							}
						}
					},
					"separator6": {
						"type": "separator"
					},
					"date": {
						"manifestpath": "/sap.card/configuration/parameters/date/value",
						"type": "date",
						"label": "Date"
					},
					"dateTime": {
						"manifestpath": "/sap.card/configuration/parameters/dateTime/value",
						"type": "datetime",
						"label": "Date Time"
					},
					"separator7": {
						"type": "separator"
					},
					"enum": {
						"manifestpath": "/sap.card/configuration/parameters/enum/value",
						"label": "Enumerations",
						"type": "enum",
						"enum": [
							"Option A",
							"Option B",
							"Option C"
						]
					},
					"lists": {
						"type": "group",
						"label": "Value Selection"
					},
					"stringWithStaticList": {
						"manifestpath": "/sap.card/configuration/parameters/stringWithStaticList/value",
						"type": "string",
						"values": {
							"data": {
								"json": {
									"values": [
										{ "text": "text1", "key": "key1", "additionalText": "addtext1", "icon": "sap-icon://accept" },
										{ "text": "text2", "key": "key2", "additionalText": "addtext2", "icon": "sap-icon://cart" },
										{ "text": "text3", "key": "key3", "additionalText": "addtext3", "icon": "sap-icon://zoom-in" }
									]
								},
								"path": "/values"
							},
							"item": {
								"text": "{text}",
								"key": "{key}",
								"additionalText": "{additionalText}",
								"icon": "{icon}"
							}
						}
					},
					"stringWithRequestList": {
						"manifestpath": "/sap.card/configuration/parameters/stringWithRequestList/value",
						"type": "string",
						"values": {
							"data": {
								"request": {
									"url": "./stringWithRequestList.json"
								},
								"path": "/"
							},
							"item": {
								"text": "{text}",
								"key": "{key}",
								"additionalText": "{additionalText}",
								"icon": "{icon}"
							}
						}
					},
					"string_Select": {
						"manifestpath": "/sap.card/configuration/parameters/string_Select/value",
						"type": "string",
						"values": {
							"data": {
								"json": [
									{ "text": 0.3, "key": "key1", "additionalText": 1293883200000, "icon": "sap-icon://accept" },
									{ "text": 0.6, "key": "key2", "additionalText": 1293883200000, "icon": "sap-icon://cart" },
									{ "text": 0.8, "key": "key3", "additionalText": 1293883200000, "icon": "sap-icon://zoom-in" }
								],
								"path": "/"
							},
							"item": {
								"text": "Percent: {= format.percent(${text}) }",
								"key": "{key}",
								"additionalText": "datetime: {= format.dateTime(${additionalText}, {style: 'long'}) }",
								"icon": "{icon}"
							}
						},
						"visualization": {
							"type": "Select",
							"settings": {
								"forceSelection": true,
								"editable": true,
								"visible": true,
								"showSecondaryValues": true
							}
						}
					},
					"stringArray": {
						"manifestpath": "/sap.card/configuration/parameters/stringArray/value",
						"label": "String Array",
						"type": "string[]",
						"values": {
							"data": {
								"json": [
									{ "text": "text1", "key": "key1", "additionalText": "addtext1", "icon": "sap-icon://accept" },
									{ "text": "text2", "key": "key2", "additionalText": "addtext2", "icon": "sap-icon://cart" },
									{ "text": "text3", "key": "key3", "additionalText": "addtext3", "icon": "sap-icon://zoom-in" }
								],
								"path": "/"
							},
							"item": {
								"text": "{text}",
								"key": "{key}",
								"additionalText": "{additionalText}",
								"icon": "{icon}"
							}
						}
					},
					"stringArrayNoValues": {
						"manifestpath": "/sap.card/configuration/parameters/stringArrayNoValues/value",
						"label": "String Array With Request List",
						"type": "string[]"
					},
					"Customers": {
						"manifestpath": "/sap.card/configuration/parameters/Customers/value",
						"type": "string[]",
						"label": "String Array With No Values",
						"values": {
							"data": {
								"request": {
									"url": "{{destinations.Northwind_V3}}/Customers",
									"parameters": {
										"$select": "CustomerID, CompanyName, Country, City, Address"
									}
								},
								"path": "/value"
							},
							"item": {
								"text": "{CompanyName}",
								"key": "{CustomerID}",
								"additionalText": "{= ${CustomerID} !== undefined ? ${Country} + ', ' +  ${City} + ', ' + ${Address} : ''}"
							}
						}
					},
					"iconNotAllowFile": {
						"manifestpath": "/sap.card/configuration/parameters/iconNotAllowFile/src",
						"type": "string",
						"label": "Icon Selectioin",
						"visualization": {
							"type": "IconSelect",
							"settings": {
								"value": "{currentSettings>value}",
								"editable": "{currentSettings>editable}",
								"allowFile": false,
								"allowNone": true
							}
						}
					},
					"icon": {
						"manifestpath": "/sap.card/header/icon/src",
						"type": "string",
						"label": "Icon",
						"visualization": {
							"type": "IconSelect",
							"settings": {
								"value": "{currentSettings>value}",
								"editable": "{currentSettings>editable}"
							}
						}
					},
					"color": {
						"manifestpath": "/sap.card/header/icon/backgroundColor",
						"type": "string",
						"label": "Icon Background",
						"description": "Description",
						"visualization": {
							"type": "ColorSelect",
							"settings": {
								"enumValue": "{currentSettings>value}",
								"editable": "{currentSettings>editable}"
							}
						},
						"cols": 1
					},
					"shape": {
						"manifestpath": "/sap.card/header/icon/shape",
						"label": "Icon Shape",
						"type": "string",
						"description": "Description",
						"visualization": {
							"type": "ShapeSelect",
							"settings": {
								"value": "{currentSettings>value}",
								"editable": "{currentSettings>editable}"
							}
						},
						"cols": 1
					},
					"group": {
						"label": "Dependent",
						"type": "group"
					},
					"stringDependent": {
						"manifestpath": "/sap.card/configuration/parameters/stringDependent/value",
						"label": "String: editable, visible, label",
						"type": "string",
						"translatable": true
					},
					"dependentString1": {
						"manifestpath": "/sap.card/configuration/parameters/dependentString1/value",
						"type": "string",
						"label": "{= ${items>stringDependent/value} === 'label'? 'stringDependent True' : 'stringDependent False' }",
						"editable": "{= ${items>stringDependent/value} === 'editable'}",
						"visible": "{= ${items>stringDependent/value} === 'visible'}"
					},
					"integerDependent": {
						"manifestpath": "/sap.card/configuration/parameters/integerDependent/value",
						"type": "integer",
						"label": "Integer: 1, 3, 6, 9"
					},
					"dependentInteger1": {
						"manifestpath": "/sap.card/configuration/parameters/dependentInteger1/value",
						"type": "string",
						"label": "{= ${items>integerDependent/value} > 8 ? 'integerDependent True' : 'integerDependent False' }",
						"editable": "{= ${items>integerDependent/value} > 5}",
						"visible": "{= ${items>integerDependent/value} > 2}"
					},
					"booleanDependent": {
						"manifestpath": "/sap.card/configuration/parameters/booleanDependent/value",
						"type": "boolean",
						"label": "Boolean",
						"visualization": {
							"type": "Switch",
							"settings": {
								"state": "{currentSettings>value}",
								"customTextOn": "Yes",
								"customTextOff": "No",
								"enabled": "{currentSettings>editable}"
							}
						}
					},
					"dependentBoolean1": {
						"manifestpath": "/sap.card/configuration/parameters/dependentBoolean1/value",
						"type": "string",
						"label": "{= ${items>booleanDependent/value} === true ? 'booleanDependent True' : 'booleanDependent False' }",
						"editable": "{items>booleanDependent/value}",
						"visible": "{items>booleanDependent/value}"
					},
					"filterBackendInStringArray": {
						"label": "Filter backend by input in MultiComboBox",
						"type": "group"
					},
					"CustomersWithMultiKeys": {
						"manifestpath": "/sap.card/configuration/parameters/CustomersWithMultiKeys/value",
						"type": "string[]",
						"values": {
							"data": {
								"request": {
									"url": "{{destinations.northwind}}/Customers",
									"parameters": {
										"$select": "CustomerID, CompanyName, Country, City, Address",
										"$filter": "startswith(CompanyName,'{currentSettings>suggestValue}')"
									}
								},
								"path": "/value"
							},
							"item": {
								"text": "{CompanyName}",
								"key": "{CustomerID}/{CompanyName}",
								"additionalText": "{= ${CustomerID} !== undefined ? ${Country} + ', ' +  ${City} + ', ' + ${Address} : ''}"
							},
							"keySeparator": "/"
						}
					},
					"CustomersWithMultiKeysAndSeperator": {
						"manifestpath": "/sap.card/configuration/parameters/CustomersWithMultiKeysAndSeperator/value",
						"type": "string[]",
						"values": {
							"data": {
								"request": {
									"url": "{{destinations.northwind}}/Customers",
									"parameters": {
										"$select": "CustomerID, CompanyName, Country, City, Address",
										"$filter": "startswith(CompanyName,'{currentSettings>suggestValue}')"
									}
								},
								"path": "/value"
							},
							"item": {
								"text": "{CompanyName}",
								"key": "{CustomerID}#{CompanyName}",
								"additionalText": "{= ${CustomerID} !== undefined ? ${Country} + ', ' +  ${City} + ', ' + ${Address} : ''}"
							}
						}
					},
					"CustomersWithFilterParameter": {
						"manifestpath": "/sap.card/configuration/parameters/CustomersWithFilterParameter/value",
						"type": "string[]",
						"values": {
							"data": {
								"request": {
									"url": "{{destinations.northwind}}/Customers",
									"parameters": {
										"$select": "CustomerID, CompanyName, Country, City, Address",
										"$filter": "startswith(CompanyName,'{currentSettings>suggestValue}')"
									}
								},
								"path": "/value"
							},
							"item": {
								"text": "{CompanyName}",
								"key": "{CustomerID}",
								"additionalText": "{= ${CustomerID} !== undefined ? ${Country} + ', ' +  ${City} + ', ' + ${Address} : ''}"
							}
						}
					},
					"CustomersWithFilterInURL": {
						"manifestpath": "/sap.card/configuration/parameters/CustomersWithFilterInURL/value",
						"type": "string[]",
						"translatable": true,
						"values": {
							"data": {
								"request": {
									"url": "{{destinations.northwind}}/Customers?$select=CustomerID, CompanyName, Country, City, Address&$filter=contains(CompanyName,'{currentSettings>suggestValue}')"
								},
								"path": "/value"
							},
							"item": {
								"text": "{CompanyName}",
								"key": "{CustomerID}",
								"additionalText": "{= ${CustomerID} !== undefined ? ${Country} + ', ' +  ${City} + ', ' + ${Address} : ''}"
							}
						}
					},
					"objectFieldGroup": {
						"type": "group",
						"label": "Object Fields"
					},
					"object": {
						"manifestpath": "/sap.card/configuration/parameters/object/value",
						"type": "object",
						"label": "Object Field"
					},
					"objectListFieldGroup": {
						"type": "group",
						"label": "Object List Fields"
					},
					"objects": {
						"manifestpath": "/sap.card/configuration/parameters/objects/value",
						"type": "object[]",
						"label": "Object List Field"
					}
				}
			},
			"preview": {
				"modes": "None"
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
            }
          ]
        }
        ```

10. stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis
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
            }
          ]
        }
        ```

11. timeseries_stacked_column
    * UIDs: timeAxis, color, valueAxis
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
            }
          ]
        }
        ```

12. 100_stacked_bar
    * UIDs: dataFrame, categoryAxis, color, valueAxis
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
            }
          ]
        }
        ```

13. 100_stacked_column
    * UIDs: dataFrame, categoryAxis, color, valueAxis
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
            }
          ]
        }
        ```

14. timeseries_100_stacked_column
    * UIDs: timeAxis, color, valueAxis
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
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expansion",
              "value": "{expansionField}"
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
              "values": ["Expansion"]
            }
          ]
        }
        ```

23. time_bubble
    * UIDs: dataFrame, color, shape, valueAxis, valueAxis2, bubbleWidth
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expansion",
              "value": "{expansionField}"
            },
            {
              "name": "Size",
              "value": "{sizeField}"
            }
          ],
          "dimensions": [
            {
              "name": "Year",
              "value": "{yearField}"
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
            }
          ]
        }
        ```

24. timeseries_bubble
    * UIDs: color, shape, valueAxis, timeAxis, bubbleWidth
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
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Achievement",
              "value": "{achievementField}"
            }
          ],
          "dimensions": [
            {
              "name": "Target",
              "value": "{targetField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Target"]
            },
            {
              "type": "Measure",
              "uid": "actualValues",
              "values": ["Achievement"]
            }
          ]
        }
        ```

30. bullet
    * UIDs: categoryAxis, color, actualValues, additionalValues, targetValues, forecastValues
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Achievement",
              "value": "{achievementField}"
            }
          ],
          "dimensions": [
            {
              "name": "Target",
              "value": "{targetField}"
            }
          ],
          "feeds": [
            {
              "type": "Dimension",
              "uid": "categoryAxis",
              "values": ["Target"]
            },
            {
              "type": "Measure",
              "uid": "actualValues",
              "values": ["Achievement"]
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
            }
          ]
        }
        ```

35. combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Expense",
              "value": "{expenseField}"
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
              "values": ["Expense"]
            }
          ]
        }
        ```

36. stacked_combination
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
              "values": ["Revenue"]
            }
          ]
        }
        ```

37. horizontal_stacked_combination
    * UIDs: dataFrame, categoryAxis, color, valueAxis
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
              "values": ["Growth"]
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
    * Example:
        ```json
        {
          "measures": [
            {
              "name": "Earnings",
              "value": "{earningsField}"
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
              "values": ["Earnings"]
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