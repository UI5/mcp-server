# UI5 Table Guidelines — Per-Control Reference

Full API examples and patterns for each UI5 table control. Loaded by the `ui5-table-guidelines` skill when per-control detail is needed.

**API links are for SAPUI5 1.136 LTS.** Replace the version segment for other releases.

## Table of Contents

1. [sap.m.Table](#1-sapmtable-responsivetable)
2. [sap.ui.table.Table](#2-sapuitabletable-gridtable)
3. [sap.ui.table.TreeTable](#3-sapuitabletreetable)
4. [sap.ui.comp.smarttable.SmartTable](#4-sapuicompsmartablesmartable)
5. [sap.ui.mdc.Table](#5-sapuimdctable)
6. [Drag & Drop](#6-drag--drop)
7. [Personalization](#7-personalization)
8. [Cell Templates & Alignment](#8-cell-templates--alignment)
9. [Performance & Accessibility](#9-performance--accessibility)

---

## 1. sap.m.Table (ResponsiveTable)

API: https://ui5.sap.com/1.136.0/api/sap.m.Table

### Items binding syntax

The `items` attribute on `<Table>` defines the binding configuration. The `<items>` element defines the template. Both are required.

**Correct — simple binding:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem>
            <cells>
                <Text text="{name}"/>
            </cells>
        </ColumnListItem>
    </items>
</Table>
```

**Correct — complex binding with sorter/filter:**
```xml
<Table items="{
    path: '/products',
    sorter: { path: 'name' }
}">
    <items>
        <ColumnListItem>
            <cells><Text text="{name}"/></cells>
        </ColumnListItem>
    </items>
</Table>
```

**Wrong — path on `<items>` element (will not work):**
```xml
<Table>
    <items path="/products">
        <ColumnListItem>...</ColumnListItem>
    </items>
</Table>
```

Debug binding in the browser console: `oTable.getBinding("items").getLength()`

### Minimal complete example

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" controllerName="my.app.controller.Main">
    <Page title="Products">
        <Table id="responsiveTable" items="{/products}" growing="true"
               growingThreshold="20" ariaLabelledBy="tableTitle"
               sticky="ColumnHeaders,HeaderToolbar">
            <headerToolbar>
                <OverflowToolbar>
                    <Title id="tableTitle" text="Products" level="H2"/>
                    <ToolbarSpacer/>
                    <Button icon="sap-icon:action-settings" press=".onPersonalize"/>
                    <Button icon="sap-icon:excel-attachment" press=".onExport"/>
                </OverflowToolbar>
            </headerToolbar>
            <columns>
                <Column>
                    <header><Text text="Name"/></header>
                </Column>
                <Column demandPopin="true" minScreenWidth="Tablet">
                    <header><Text text="Category"/></header>
                </Column>
                <Column hAlign="End">
                    <header><Text text="Price"/></header>
                </Column>
            </columns>
            <items>
                <ColumnListItem>
                    <cells>
                        <Text text="{name}"/>
                        <Text text="{category}"/>
                        <ObjectNumber number="{price}" unit="{currency}"/>
                    </cells>
                </ColumnListItem>
            </items>
        </Table>
    </Page>
</mvc:View>
```

### Column header

Always use the `header` aggregation. Placing a control directly inside `<Column>` without `<header>` is wrong.

**Wrong:**
```xml
<Column><Text text="Name"/></Column>
```

**Correct:**
```xml
<Column>
    <header><Text text="Name"/></header>
</Column>
```

### Sticky headers (UI5 1.58+)

```xml
<Table sticky="ColumnHeaders,HeaderToolbar" items="{/products}">
```

Valid `sticky` values: `ColumnHeaders`, `HeaderToolbar`, `InfoToolbar`. Combine with commas.

### Key properties

| Property | Type | Default | Since | Notes |
|---|---|---|---|---|
| `growing` | boolean | false | 1.16.0 | Enable load-more. |
| `growingThreshold` | int | 20 | 1.16.0 | Items per load. |
| `growingScrollToLoad` | boolean | false | 1.16.0 | Load on scroll vs. button. |
| `sticky` | Sticky[] | — | 1.58 | Sticky column/header/info toolbar. |
| `multiSelectMode` | MultiSelectMode | Default | 1.93 | `Default` or `ClearAll`. |
| `rememberSelections` | boolean | true | 1.16.6 | Set to `false` with `$$sharedRequests`. |
| `autoPopinMode` | boolean | false | 1.0 | Auto-hide columns by importance. |
| `contextualWidth` | ScreenSize | undefined | 1.60 | Container-based responsive behavior. |
| `hiddenInPopin` | string[] | [] | 1.77 | Hide columns completely by ID. |
| `popinLayout` | PopinLayout | Block | 1.52 | Block / GridLarge / GridSmall. |
| `fixedLayout` | FixedLayout | true | 1.0 | Use `Strict` for precise widths. |
| `keyboardMode` | KeyboardMode | Navigation | 1.38 | `Navigation` or `Edit`. |

### OData V4 selection

Set `rememberSelections="false"` when using `$$sharedRequests` or `$$clearSelectionOnFilter`.

### Responsive behavior patterns

Container-based width:
```xml
<Table contextualWidth="Desktop" items="{/products}">
```

Hide columns completely (reference by column ID):
```xml
<Table hiddenInPopin="categoryCol,statusCol" items="{/products}">
    <columns>
        <Column id="categoryCol" demandPopin="true" minScreenWidth="Tablet"/>
    </columns>
</Table>
```

Auto pop-in by importance:
```xml
<Table autoPopinMode="true" items="{/products}">
    <columns>
        <Column importance="High"><header><Text text="Name"/></header></Column>
        <Column importance="Medium"><header><Text text="Category"/></header></Column>
        <Column importance="Low"><header><Text text="Status"/></header></Column>
    </columns>
</Table>
```

### ColumnListItem highlight

Do not use a formatter for `highlight`. Use direct binding or `ObjectStatus`.

Valid `highlight` values: `None`, `Success`, `Warning`, `Error`, `Information`.

### Events

| Event | Since | Parameters | Use |
|---|---|---|---|
| `paste` | 1.60 | `data: string[][]` | Paste tabular data. |
| `popinChanged` | 1.77 | `hasPopin`, `visibleInPopin[]`, `hiddenInPopin[]` | Track responsive changes. |
| `updateStarted` / `updateFinished` | 1.16.3 | `reason`, `actual`, `total` | Busy indicators. |
| `beforeOpenContextMenu` | 1.54 | `listItem`, `column` | Context menu. |

### Grouping with sap.ui.model.Sorter

The grouper function (3rd parameter of `Sorter`) returns `{key, text}` for grouping logic. The group header factory is a separate concern called by UI5 when rendering.

**Correct:**
```javascript
_createCategorySorter: function() {
    return new Sorter("category", false, function(oContext) {
        var sCategory = oContext.getProperty("category");
        return { key: sCategory, text: sCategory };
    });
},

// Apply:
this.byId("productsTable").getBinding("items").sort(this._createCategorySorter());
```

**Wrong:**
```javascript
// Do not pass the group header factory as the grouper function
new Sorter("category", false, this.getGroupHeader.bind(this))
```

**Group header factory (separate):**
```javascript
getGroupHeader: function(oGroup) {
    return new GroupHeaderListItem({
        title: oGroup.text,
        count: "(" + oGroup.count + ")"
    });
}
```

---

## 2. sap.ui.table.Table (GridTable)

API: https://ui5.sap.com/1.136.0/api/sap.ui.table.Table

### Minimal complete example

```xml
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:table="sap.ui.table"
        controllerName="my.app.controller.Main">
    <Page title="Products">
        <table:Table id="gridTable" rows="{/products}" selectionMode="MultiToggle"
                ariaLabelledBy="gridTableTitle" threshold="100">
            <table:extension>
                <OverflowToolbar>
                    <Title id="gridTableTitle" text="Products" level="H2"/>
                    <ToolbarSpacer/>
                    <Button icon="sap-icon:action-settings" press=".onPersonalize"/>
                </OverflowToolbar>
            </table:extension>
            <table:rowMode>
                <table:rowmodes:Fixed rowCount="10"/>
            </table:rowMode>
            <table:columns>
                <table:Column>
                    <Label text="Name"/>
                    <table:template><Text text="{name}" wrapping="false"/></table:template>
                </table:Column>
                <table:Column hAlign="End">
                    <Label text="Price"/>
                    <table:template><ObjectNumber number="{price}" unit="{currency}"/></table:template>
                </table:Column>
            </table:columns>
        </table:Table>
    </Page>
</mvc:View>
```

### Key properties

| Property | Type | Default | Since | Notes |
|---|---|---|---|---|
| `selectionBehavior` | SelectionBehavior | RowSelector | 1.0 | `Row`, `RowSelector`, `RowOnly`. |
| `columnHeaderVisible` | boolean | true | 1.0 | Show/hide column headers. |
| `showNoData` | boolean | true | 1.0 | Show "No data" text. |
| `noData` | string / Control | — | 1.0 | Custom no-data content. |
| `showOverlay` | boolean | false | 1.21 | Block interaction with overlay. |
| `threshold` | int | 100 | 1.0 | Prefetch buffer for virtualization. |

### rowMode aggregation (UI5 1.119+)

Use the `rowMode` aggregation instead of the deprecated `visibleRowCountMode` property.

```xml
<table:rowMode>
    <table:rowmodes:Fixed rowCount="10"/>
</table:rowMode>
```

Available row modes: `Fixed`, `Auto`, `Interactive`.

### Selection behavior

- `Row`: selection changed anywhere in the row, including the selector column.
- `RowSelector`: selection changed only via the selector column; row clicks do not select.
- `RowOnly`: selection changed only via row clicks; the selector column is hidden.

Do not call the table's selection API when a `SelectionPlugin` is attached. Use the plugin API instead.

### No-data customization

```xml
<table:Table>
    <table:noData>
        <IllustratedMessage illustrationType="NoData" title="No Products">
            <Button text="Add Product" press=".onAddProduct"/>
        </IllustratedMessage>
    </table:noData>
</table:Table>
```

---

## 3. sap.ui.table.TreeTable

API: https://ui5.sap.com/1.136.0/api/sap.ui.table.TreeTable

### Key properties

| Property | Description |
|---|---|
| `useGroupMode` | Group headers vs. tree icons. |
| `groupHeaderProperty` | Property for group header text. |

### Hierarchical binding

JSON model:
```javascript
rows="{path: '/categories', parameters: {arrayNames: ['children']}}"
```

OData V2:
```xml
<table:TreeTable rows="{
    path: '/Nodes',
    parameters: {
        countMode: 'Inline',
        treeAnnotationProperties: {
            hierarchyLevelFor: 'HierarchyLevel',
            hierarchyNodeFor: 'NodeID',
            hierarchyParentNodeFor: 'ParentNodeID',
            hierarchyDrillStateFor: 'DrillState'
        }
    }
}">
```

Root level configuration:
```javascript
oTable.bindRows({
    path: "/Employees",
    parameters: {
        rootLevel: 1,
        navigation: { Employees: "Manager" }
    }
});
```

### Programmatic control

Use `expandToLevel`, `collapseAll`, `expand`, and `collapse` to manage hierarchy state.

### Restrictions

- No mobile equivalent.
- Column reordering is supported, but the first column cannot be moved or have columns moved before it (preserves tree structure).
- Fixed bottom rows are supported via `rowMode` but are typically used for summary rows only.

---

## 4. sap.ui.comp.smarttable.SmartTable

API: https://ui5.sap.com/1.136.0/api/sap.ui.comp.smarttable.SmartTable

### Key annotations

| Annotation | Purpose |
|---|---|
| `@UI.LineItem` | Define columns and column order (collection of `DataField` records). |
| `@UI.Hidden` | Exclude a field from the table. |
| `@UI.Importance` | Responsive priority: `High`, `Medium`, `Low`, `None`. |
| `@Common.Label` | Column header text. |
| `@Measures.ISOCurrency` | Currency formatting. |

### Annotation pattern

```xml
<Annotations Target="MyService.Product">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="ProductID"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="Name"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High"/>
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="Price"/>
                <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/Medium"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

### SmartTable configuration

```xml
<smartTable:SmartTable id="smartTable" entitySet="Products"
    tableType="ResponsiveTable"
    useTablePersonalisation="true"
    useVariantManagement="true"
    useExportToExcel="true"
    header="Products"
    showRowCount="true"
    enableAutoBinding="true"
    ignoredFields="InternalID"
    requestAtLeastFields="Currency"/>
```

### Troubleshooting

- Column does not appear: add a `DataField` record to `UI.LineItem`.
- Wrong column header: add or correct `Common.Label`.
- Column hidden: adjust `UI.Importance` to `Medium` or `High`.
- Missing currency formatting: add `Measures.ISOCurrency`.

---

## 5. sap.ui.mdc.Table

API: https://ui5.sap.com/1.136.0/api/sap.ui.mdc.Table

### Delegate pattern

`sap.ui.mdc.Table` uses a delegate for metadata and data operations. Implement both `fetchProperties` and `updateBindingInfo`.

Minimal delegate:
```javascript
sap.ui.define(["sap/ui/mdc/odata/v4/TableDelegate"], function(TableDelegate) {
    const MyDelegate = Object.assign({}, TableDelegate);

    MyDelegate.fetchProperties = function(oTable) {
        return Promise.resolve([
            {
                key: "name", label: "Name",
                dataType: "sap.ui.model.type.String",
                sortable: true, filterable: true
            },
            {
                key: "price", label: "Price",
                dataType: "sap.ui.model.type.Float",
                sortable: true, filterable: true
            }
        ]);
    };

    return MyDelegate;
});
```

### MDC table usage

```xml
<!-- The delegate uses the payload to construct the binding info. -->
<mdc:Table id="mdcTable" header="Products"
    delegate="{name: 'my/app/delegate/TableDelegate', payload: {entitySet: 'Products'}}"
    p13nMode="Column,Sort,Filter" autoBindOnInit="true">
    <mdc:columns>
        <mdc:Column header="Name" propertyKey="name">
            <Text text="{name}"/>
        </mdc:Column>
        <mdc:Column header="Price" propertyKey="price">
            <ObjectNumber number="{price}"/>
        </mdc:Column>
    </mdc:columns>
</mdc:Table>
```

---

## 6. Drag & Drop

### Placement rule

Configure drag-and-drop on the **table**, not on individual items or cells.

**Wrong — DnD on the item:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem>
            <dragDropConfig>
                <dnd:DragInfo sourceAggregation="items"/>
            </dragDropConfig>
            <cells>...</cells>
        </ColumnListItem>
    </items>
</Table>
```

**Correct — reordering within the same table using `DragInfo` + `DropInfo` with matching `groupName`:**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem><cells>...</cells></ColumnListItem>
    </items>
    <dragDropConfig>
        <dnd:DragInfo sourceAggregation="items" groupName="reorder"/>
        <dnd:DropInfo targetAggregation="items"
            groupName="reorder"
            dropPosition="Between"
            drop=".onDrop"/>
    </dragDropConfig>
</Table>
```

**Alternative — using `DragDropInfo` (no `groupName` needed for same-table reorder):**
```xml
<Table items="{/products}">
    <items>
        <ColumnListItem><cells>...</cells></ColumnListItem>
    </items>
    <dragDropConfig>
        <dnd:DragDropInfo sourceAggregation="items"
            targetAggregation="items"
            dropPosition="Between"
            drop=".onDrop"/>
    </dragDropConfig>
</Table>
```

### Key rules

- For reordering within the same table: either use `DragDropInfo`, or set a matching `groupName` on both `DragInfo` and `DropInfo`. Without one of these, items cannot be dropped within the same table.
- For drag between different tables: use matching `groupName` values on both tables.
- Update the bound model in the `drop` handler to reflect the new order.

---

## 7. Personalization

Use `sap.m.p13n.Engine` for all personalization (column visibility, order, sorting, filtering). Do not build custom personalization dialogs.

Open the personalization dialog:
```javascript
Engine.getInstance().show(oTable, ["Columns", "Sort", "Filter"], {
    contentWidth: "30rem",
    contentHeight: "35rem",
    source: oButton
});
```

Register the table with the Engine before calling `show`.

---

## 8. Cell Templates & Alignment

### Alignment by data type

| Data type | Alignment | Property |
|---|---|---|
| Text | Left | default |
| Numbers | Right | `hAlign="End"` |
| Dates | Right | `hAlign="End"` |
| Boolean | Left | default |
| Links | Left | default |

Set `hAlign` on the `Column` control, not on the cell template.

### Cell template selection

| Content type | Template control |
|---|---|
| Plain text | `sap.m.Text` |
| Formatted number / amount | `sap.m.ObjectNumber` |
| Navigation | `sap.m.Link` |
| Status | `sap.m.ObjectStatus` |
| Icon | `sap.ui.core.Icon` |

---

## 9. Performance & Accessibility

### Anti-patterns to avoid

- Handcrafted personalization dialogs (use `sap.m.p13n.Engine`).
- Text wrapping in `sap.ui.table.Table` cells.
- Multiple interactive elements in one GridTable cell.
- Mixing OData V2 `SmartTable` with V4 services.
- Deep nesting in cell templates.
- Fixed `threshold` without load testing.
- Unconditional `$count=true` (request count only when needed).
- Skipping accessibility testing with a screen reader.

### Accessibility checklist

- Set `ariaLabelledBy` on every table, referencing the visible title.
- Use `sap.m.Text` (not raw text nodes) as cell templates.
- For `sap.ui.table.Table`: test keyboard navigation (Tab, arrow keys, Space/Enter for selection).
- Verify that the personalization dialog is keyboard-operable.
- Test with a screen reader (NVDA/JAWS on Windows, VoiceOver on macOS) before shipping.

---

*Source: CPOUIFTEAMB-2584, tested against SAPUI5 1.136 LTS.*
