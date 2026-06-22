---
name: ui5-table-guidelines
description: 'This skill should be used when the user asks to "create a table", "add a table", "which table should I use", "implement sap.m.Table", "implement sap.ui.table", "GridTable", "ResponsiveTable", "TreeTable", "SmartTable", "MDC table", "sap.ui.mdc.Table", "sap.ui.comp.smarttable", "table not showing data", "table binding", "table selection", "drag and drop table", "table personalization", "copy paste table", "table export", "table sticky header", "table growing", "table pop-in", "table performance", "table accessibility", "table items binding", or is writing any UI5 freestyle application that includes a table control. Provides authoritative UI5 table development guidelines covering control selection, mandatory rules, error patterns, and per-control API guidance for sap.m.Table, sap.ui.table.Table, sap.ui.table.TreeTable, sap.ui.comp.smarttable.SmartTable, and sap.ui.mdc.Table.'
user-invokable: false
---

# UI5 Table Development Guidelines

Apply these guidelines whenever generating, reviewing, or troubleshooting UI5 table code in freestyle applications.

**UI5 version baseline:** SAPUI5 1.136+ LTS. All features mentioned are available from this version unless noted.

---

## How to apply this skill

1. Read the [Core Rules](#core-rules) and [Selection Matrix](#selection-matrix) before generating any table code.
2. Apply the [Common Errors](#common-errors) table to diagnose issues when the user reports a problem.
3. For per-control detail (XML examples, key properties, events, patterns), read `references/table-guidelines.md` and apply the relevant section.

Do not skip step 1 even for small snippets — the mandatory rules and prohibitions prevent the most common and hard-to-debug errors.

---

## Core Rules

### Mandatory

- Choose the table type using the [Selection Matrix](#selection-matrix) before writing any code.
- Use the `rows` aggregation for `sap.ui.table.*` and `items` for `sap.m.Table`. Never swap them.
- Use `sap.m.p13n.Engine` for personalization. Never build custom personalization dialogs.
- Set `ariaLabelledBy` on every table, referencing the table title control.
- Align cell content by data type: numbers and dates right (`hAlign="End"`), text and links left.
- Use appropriate cell templates: `sap.m.Text` for display, `sap.m.ObjectNumber` for numbers, `sap.m.Link` for navigation.
- Request `$count=true` from the back end for `sap.ui.table.*` when a total count is required.
- Use the `rowMode` aggregation (not the deprecated `visibleRowCountMode` property) for `sap.ui.table.*` (UI5 1.119+).

### Prohibitions

- Do not use global variables. Use `sap.ui.define` AMD modules.
- Do not enable text wrapping in `sap.ui.table.*` cells — it breaks virtualization.
- Do not assume `sap.ui.export.Spreadsheet` is available. Detect the library before use.
- Do not use `sap.ui.table.Table` for mobile-first scenarios. Use `sap.m.Table`.
- Do not use `sap.m.Table` for datasets with 1000+ rows that require virtualization.
- Do not place multiple interactive elements in one `sap.ui.table.Table` cell.
- Do not return enum objects from formatters. Return string literals or primitive values.
- Do not use formatters for `ColumnListItem` `highlight`. Use direct data binding.
- Do not access models without checking availability — causes "Cannot read properties of undefined".
- Do not mix type namespaces: never use `sap.ui.model.odata.type.*` with a JSON model, or `sap.ui.model.type.*` with OData.

### OData V4 policy

Prefer SAP Fiori elements building blocks over freestyle tables for OData V4. Use `sap.ui.mdc.Table` only when Fiori elements is out of scope.

---

## Selection Matrix

| Table type | Use when | Do not use when |
|---|---|---|
| `sap.m.Table` | Mobile/responsive, pop-in behavior, JSON models, fewer than 100 rows | 1000+ rows, virtualization required, desktop-only, cell selection needed |
| `sap.ui.table.Table` | Desktop, 1000+ rows, virtualization, fixed columns, dense data | Mobile-first, pop-in required, text wrapping, small datasets |
| `sap.ui.table.TreeTable` | Hierarchical data, expand/collapse, parent-child relationships | Flat data, mobile-first, grouping (not hierarchy) |
| `SmartTable` | OData V2, annotations, automatic columns, smart filtering | JSON-only, precise control required, OData V4 |
| `sap.ui.mdc.Table` | OData V4 freestyle (when Fiori elements is ruled out), delegate pattern | JSON-only, simple apps, OData V2 |

### Dataset size guide

| Rows | Recommended table | Strategy |
|---|---|---|
| < 100 | `sap.m.Table` | Simple binding, `growing` optional |
| 100–1000 | `sap.ui.table.Table` | Virtualization, `threshold=100` |
| 1000+ | `sap.ui.table.Table` | Virtualization, `threshold=100–500`, `$count=true` when needed |

---

## Common Errors

Apply this table first when diagnosing a reported problem.

| Symptom | Cause | Fix |
|---|---|---|
| No data displayed | Incorrect binding path or missing model | Verify `bindRows`/`bindItems` path and model attachment. |
| Rows not scrolling (`sap.ui.table.*`) | Count not requested | Set `$count=true` for OData when a total count is required. |
| Selection not working (`sap.ui.table.*`) | Plugin conflict | Do not call the table selection API when a selection plugin is applied; use the plugin API instead. |
| Text wrapping issues | Wrapping enabled in `sap.ui.table.*` | Use fixed-height content or switch to `sap.m.Table`. |
| Copy/paste not working | Plugin not attached or wrong namespace | Attach the correct plugin. See `references/table-guidelines.md` section 6. |
| Personalization not persisting | Engine not configured | Verify `sap.m.p13n.Engine` registration. |
| `CopyProvider` error | `extractData` not defined | Implement `extractData` on the plugin. |
| Table not visible | Invalid container structure | Use a valid container. See [Container Structures](#container-structures). |
| OData types on JSON model | Wrong type namespace | Match the type namespace to the model: `sap.ui.model.type.*` for JSON, `sap.ui.model.odata.type.*` for OData V2, `sap.ui.model.odata.v4.type.*` for OData V4. |
| Plugin path not found | Incorrect namespace | Use exact plugin paths from the API reference. |
| Excel export fails silently | Library not loaded or invalid `extractData` | Detect the library, return a 2D array from `extractData`, ensure `dataSource` binding. |
| "No Data Available" | Model not set before binding | Set the model in `Component.init()` before router initialization. |

---

## Container Structures

### Valid

| Structure | Use case |
|---|---|
| `View > Page > content > Table` | Standard page |
| `View > Page > content > Panel > Table` | Grouped content |
| `View > Page > content > IconTabBar > items > IconTabFilter > Table` | Tabs |
| `View > SplitApp > detailPages > Page > Table` | Master-detail |
| `View > Dialog > content > Table` | Modal |
| `View > Table` | Standalone |

### Invalid (and why)

| Structure | Issue |
|---|---|
| `Page > content > VBox > Table` | `VBox` needs explicit height — table becomes invisible |
| `Page > VBox > Table` | `VBox` not in `content` — table not rendered |
| `Page > content > FlexBox > Table` | Sizing conflict — table collapses |
| `Page > content > ScrollContainer > Table` | Double scrolling — virtualization breaks |

---

## Model type binding

Never mix namespaces. Always match the type to the model:

```xml
<!-- JSON Model -->
<Text text="{path: 'price', type: 'sap.ui.model.type.Float'}"/>

<!-- OData V2 -->
<Text text="{path: 'Price', type: 'sap.ui.model.odata.type.Decimal'}"/>

<!-- OData V4 -->
<Text text="{path: 'Price', type: 'sap.ui.model.odata.v4.type.Decimal'}"/>
```

---

## Per-control detail

For full XML examples, key properties, events, and patterns for each table type, read `references/table-guidelines.md` and apply the section matching the control being used:

| Section | Control |
|---|---|
| 1 | `sap.m.Table` — items binding, grouping, sticky headers, responsive behavior, events |
| 2 | `sap.ui.table.Table` — `rowMode`, selection behavior, no-data customization |
| 3 | `sap.ui.table.TreeTable` — hierarchical binding, JSON and OData V2, programmatic control |
| 4 | `sap.ui.comp.smarttable.SmartTable` — annotations, `UI.LineItem`, configuration, troubleshooting |
| 5 | `sap.ui.mdc.Table` — delegate pattern, `fetchProperties`, MDC table usage |
| 6 | Drag & Drop — placement rules, `DragDropInfo`, reorder within table |
| 7 | Personalization — `sap.m.p13n.Engine`, `Engine.getInstance().show()` |
| 8 | Cell Templates & Alignment — alignment by type |
| 9 | Performance & Accessibility — anti-patterns |

---

## Additional Resources

- **`references/table-guidelines.md`** — complete per-control API reference with XML/JS examples for all five table types, drag and drop, personalization, cell templates, and performance/accessibility.
