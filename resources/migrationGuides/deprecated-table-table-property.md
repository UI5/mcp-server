# Guide for Migrating Deprecated `sap/ui/table/Table` Row Properties

> *This guide provides instructions for AI-based development tools to refactor the deprecated row-related properties of the `sap.ui.table.Table` control. The migration involves replacing these properties with the modern `rowMode` aggregation.*

## 1. Core Concept: From Properties to an Aggregation

The legacy approach used a flat list of properties on the `sap.ui.table.Table` control itself (e.g., `visibleRowCount`, `visibleRowCountMode`, `rowHeight`). This is deprecated in favor of a more structured and powerful `rowMode` aggregation.

The migration involves two main actions:
1. **Removing** the set of old, deprecated properties.
2. **Adding** a single `<rowMode>` aggregation that contains a specific `RowMode` object (`Fixed`, `Interactive`, or `Auto`). The properties that were previously on the table are now set on this new `RowMode` object.

Important: **do not attempt to migrate `sap.ui.table.Table` to the newer `sap.m.Table` control**, as this is not a direct replacement and might break existing functionality and extensions within the application.

## 2. Pre-Migration Analysis & Rules

To ensure a safe and accurate migration, the agent **must** perform these checks before modifying any code.

1. Detect Dynamic Property Setting (Critical Safety Check)
    * **Condition:** One of the properties set in the source does not exist on the picked RowMode class. This might be an indicator for dynamic switching of the row mode at runtime, e.g. in the relevant controller class.
    * **Action:** **Abort migration for this table instance.** Migrating this automatically is unsafe. Instead inform the developer about the inconsistency and suggest a manual review of the view and controller code.

## 3. Property Mapping

The following table maps the deprecated table properties to their new counterparts on the `RowMode` object.

| Deprecated Property on `Table`  | New Property on `RowMode` Object | Notes                                  |
| ------------------------------- | -------------------------------- | -------------------------------------- |
| `visibleRowCountMode`           | (Determines the `RowMode` class) | `Fixed` -> `rowmodes.Fixed`, etc.      |
| `visibleRowCount`               | `rowCount`                       | Used only in `Fixed` and `Interactive` mode |
| `minAutoRowCount`               | `minRowCount`                    | Used only in `Auto` mode               |
| `rowHeight`                     | `rowContentHeight`               | Name change for clarity                |
| `fixedRowCount`                 | `fixedTopRowCount`               | Name change (`Top` added)              |
| `fixedBottomRowCount`           | `fixedBottomRowCount`            | No change                              |


## 4. Migration Scenario 1: XML Views

This is the most common scenario, where the table is defined declaratively.

### Migration Steps

1. **Add XML Namespace:** In the root `mvc:View` tag, ensure the namespace for table row modes is declared. If it doesn't exist, add `xmlns:rowmodes="sap.ui.table.rowmodes"`.
2. **Remove Deprecated Properties:** Delete all properties from the `<Table>` element that are listed in the mapping table above (e.g., `visibleRowCountMode`, `visibleRowCount`, `rowHeight`, etc.).
3. **Create `<rowMode>` Aggregation:** Inside the `<Table>` element, add a `<rowMode>` aggregation tag.
4. **Instantiate Correct `RowMode`:** Inside `<rowMode>`, add the `RowMode` element that corresponds to the old `visibleRowCountMode` value:
    * `"Fixed"` becomes `<rowmodes:Fixed />`
    * `"Interactive"` becomes `<rowmodes:Interactive />`
    * `"Auto"` becomes `<rowmodes:Auto />`
5. **Apply Migrated Properties:** Add the new properties to the `RowMode` element (`<rowmodes:Fixed>`, etc.) according to the mapping table.

### Example (RowMode: Fixed)

**Before:**

```xml
<Table
    selectionMode="MultiToggle"
    rows="{/ProductCollection}"
    visibleRowCountMode="Fixed"
    visibleRowCount="5"
    fixedRowCount="1"
    fixedBottomRowCount="2"
    rowHeight="30">
    ...
</Table>
```

**After:**

```xml
<!-- In mvc:View -->
xmlns:rowmodes="sap.ui.table.rowmodes"

<!-- ... -->

<Table
    selectionMode="MultiToggle"
    rows="{/ProductCollection}">
    <rowMode>
        <rowmodes:Fixed rowCount="5" fixedTopRowCount="1" fixedBottomRowCount="2" rowContentHeight="30"/>
    </rowMode>
    ...
</Table>
```

---

## 5. Migration Scenario 2: JavaScript Instantiation

This scenario applies if the table is created programmatically in a controller or other JavaScript module.

### Migration Steps

1. **Identify Dependencies:** The agent must add the required `RowMode` class to the `sap.ui.define` dependency array. For example, if migrating to `Fixed` mode, add `"sap/ui/table/rowmodes/Fixed"`.
2. **Remove Deprecated Setters:** Find and delete any calls that set the deprecated properties (e.g., `oTable.setVisibleRowCount(...)`, `oTable.setRowHeight(...)`).
3. **Instantiate `RowMode` Object:** Create a new instance of the appropriate `RowMode` class, passing the migrated properties to its constructor.
4. **Set `rowMode` Aggregation:** Set the newly created `RowMode` object in the constructor call of the table. Alternatively use the `setRowMode` method to apply the object after the table instance has been created.

### Example (RowMode: Interactive)

**Before:**

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Table",
    "sap/ui/table/Column"
], (Controller, Table, Column) => {
    "use strict";
    return Controller.extend("my.app.Controller", {
        onInit() {
            const oTable = new Table({
                visibleRowCountMode: "Interactive", // Deprecated
                visibleRowCount: 10,             // Deprecated
                rowHeight: 25                      // Deprecated
            });
            // ... more table setup
            this.getView().addContent(oTable);
        }
    });
});
```

**After:**

```javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Table",
    "sap/ui/table/Column",
    "sap/ui/table/rowmodes/Interactive" // <-- 1. Add dependency
], (Controller, Table, Column, InteractiveRowMode) => { // <-- Pass as argument
    "use strict";
    return Controller.extend("my.app.Controller", {
        onInit() {
            // 3. Instantiate RowMode object with new properties
            const oRowMode = new InteractiveRowMode({
                rowCount: 10,
                rowContentHeight: 25
            });

            const oTable = new Table({
                // 2. Deprecated properties are removed
                rowMode: oRowMode, // <-- 4. Set the aggregation
            });


            // ... more table setup
            this.getView().addContent(oTable);
        }
    });
});
```
