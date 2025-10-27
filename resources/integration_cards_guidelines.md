# UI Integration Cards Development Guidelines

> *This document outlines the fundamental rules and best practices an AI agent must follow when developing or modifying Integration Cards. Adherence to these guidelines is critical for creating modern, maintainable, and performant UI Integration Cards.*
## 1. Coding Guidelines
- **ALWAYS** attempt to make declarative Integration Card, such as "Calendar", "List", "Table", "Timeline", "Object" or "Analytical".
  - in rare cases, you can also create Integration Card Extension.
- **ALWAYS** create links using the `actions` property.
- **ALWAYS** refer to parameters using correct syntax - `{parameters>/parameterKey/value}`.
- **ALWAYS** perform validation of the integration card as described in [2. Validation](#2-validation).
- **ALWAYS** show a preview of the generated card following the [4. Preview Instructions](#4-preview-instructions).
- **ALWAYS** generate new declarative integration cards using the `create_integration_card` tool.

### 1.1 Data
- **NEVER** modify the given data under any circumstances
- **ALWAYS** place service URL directly in the card manifest when provided
- **ALWAYS** use destinations by their name when provided. Configure the destination in the `sap.card/configuration/destinations/` and reuse it with binding syntax like `{{destinations.destinationName}}`.
- **NEVER** replace destination name with its URL
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
- Symptom: "No data to display" message appears
- Cause: Incorrect data configuration or data path in the content incorrectly overrides the primary data path.
- Solution: Verify all rules in [1.1 Data](#11-data) are properly followed

### 1.2 Internationalization
- **ALWAYS** bind properties that are not bound to the data to the `i18n` model

### 1.3 Analytical Cards
- **ALWAYS** follow [6. Analytical Cards Coding Guidelines](#6-analytical-cards-coding-guidelines) when developing Analytical cards.

## 2. Validation
- **ALWAYS** ensure that `manifest.json` file is valid JSON.
- **ALWAYS** ensure that in `manifest.json` file the property `sap.app/type` is set to `"card"`.
- **ALWAYS** avoid deprecated properties in `manifest.json` and other places.
- **NEVER** treat Integration Cards project as UI5 project, except for cards of type "Component".

## 3. Card Explorer
- Contains detailed description for every property in the Integration Cards Schema, integration of cards in hosting environments, examples, configuration editor documentation and examples, and many more broader topics and best practices,
- can be found at https://ui5.sap.com/test-resources/sap/ui/integration/demokit/cardExplorer/webapp/index.html

## 4. Preview Instructions
- **ALWAYS** search the existing card folder for preview instructions or scripts and use them, if available.
  * for example, in NodeJS-based projects, search the `package.json` file for `start` or similar script. If such is available, use it
  * also search in the `README.md` file.
- If preview instructions are not available, you have to create an html page, that contains a `ui-integration` card element that uses the card manifest. Then serve the html page using `http` server.

## 5. Configuration Editor
- When there is Configuration Editor, always try to make most of the integration card fields editable.

## 6. Analytical Cards Coding Guidelines
- **ALWAYS** set `sap.card/content/chartType` property.
- **ALWAYS** adjust `sap.card/content/measures`, `sap.card/content/dimensions` and `sap.card/content/feeds` based on the `sap.card/content/chartType` property and data structure. This is critical for proper data display.
- **ALWAYS** use `sap.card/content/chartProperties` to adjust labels, colors, the legend, and other thing of the chart.
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
- **ALWAYS** ensure that the uid in feeds accurately matches the required UID for your chosen chartType (e.g., color, size, dataFrame).

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