# UI5 Development Guidelines

> *This document outlines the fundamental rules and best practices an AI agent must follow when developing or modifying SAPUI5 projects. Adherence to these guidelines is critical for creating modern, maintainable, and performant applications.*

## 1. Coding Guidelines

- **NEVER** use global variables to access UI5 framework objects (e.g., `sap.m.Button`). Instead, explicitly declare all dependencies, so that they are loaded asynchronously before your code executes.
  - in JavaScript: Using `sap.ui.define` at the top of the file (which also registers the file as a UI5 module) or dynamically using `sap.ui.require`
  - in TypeScript: Using ES6 `import` statements
  - in XML:
    - For controls it is sufficient to declare the corresponding XML tag (e.g. `<m:Button></m:Button>`). The XML Template engine will load the corresponding resource automatically.
    - However, when referring to programmatic API like formatters or types, those must be "imported" using a `core:require` directive
    - Example
      ```xml
       <ObjectListItem
          core:require="{
              Currency: 'sap/ui/model/type/Currency'
          }"
          title="{invoice>Quantity} x {invoice>ProductName}"
          number="{
              parts: [
                  'invoice>ExtendedPrice',
                  'view>/currency'
              ],
              type: 'Currency',
              formatOptions: {
                  showMeasure: false
              }
          }"
          numberUnit="{view>/currency}"/>
      ```
    - Find more information on the UI5 documentation page "Require Modules in XML View and Fragment"
- **ALWAYS** use the `sap/ui/core/ComponentSupport` module to initialize a UI5 application/component in an HTML page
  - Example:
    ```html
    <!-- index.html -->
    <script id="sap-ui-bootstrap"
      src="resources/sap-ui-core.js"
      data-sap-ui-on-init="module:sap/ui/core/ComponentSupport"
      data-sap-ui-async="true"
      data-sap-ui-resource-roots='{ "my.app": "./" }'
      data-...="...">
    </script>
    ```
  - Find more information on the UI5 documentation page "Declarative API for Initial Components"
- **ALWAYS** use data binding in views to connect UI controls to data or i18n models.
  - When binding data from OData services, **NEVER** use custom formatters for standard data types (e.g., dates, numbers, currencies). The built-in types handle these cases automatically.
- When making changes to `*.properties` files, **ALWAYS** apply the changes to all relevant locales. This ensures consistency across different language versions of the application.
  - **Example:** If you add a new key to `i18n.properties`, also add it to existing translation files like e.g `i18n_en.properties`, `i18n_de.properties`, etc.
- **NEVER** use inline script in HTML
  - All application logic must reside in dedicated JS or TS files. Inline `<script>` would violate the recommended CSP settings for UI5 applications.
  - Find more information on the UI5 documentation page "Content Security Policy"

### TypeScript: Special Handling for Control Event Handlers

- **Rule:** For any control event handler, import and use the specific event type from the control's module. The type is typically named `<ControlName>$<EventName>Event`. Notice the "Event" suffix.
- **Example:** For the `press` event of `sap.m.Button`, use `import {Button$PressEvent} from "sap/m/Button"`.
  - The event handler then may look like this: `onPress(event: Button$PressEvent): void { [...]`.
- **Benefit:** This provides static type checking and autocompletion for event parameters (e.g., `event.getParameter(...)`) without needing manual casting or comments.
- **Version Compatibility:**
    - **UI5 >= 1.115.0:** This feature is available and **MUST** be used.
    - **UI5 < 1.115.0:** These specific types are **NOT** available. Use the generic `import Event from "sap/ui/base/Event"` as the fallback type.

**Example (UI5 >= 1.115.0):**

```ts
// Import the specific event type from the control's module
import { Table$RowSelectionChangeEvent } from "sap/ui/table/Table";
import Table from "sap/ui/table/Table";

// ... inside a controller class
public onRowSelectionChange(event: Table$RowSelectionChangeEvent): void {
    // Correctly typed: getParameter is known and its return value can be inferred
    const selectedContext = event.getParameter("rowContext");
    // ...
}
```

## 2. Tooling and Environment Interaction

An AI agent must understand how to use and interpret the standard UI5 development tools, primarily through the available MCP tools.

- **API Lookup:** To get information on UI5 controls and APIs, **ALWAYS** use the `get_api_reference` tool. This provides direct access to the official UI5 API Reference. Provide it with a path to the current project and it will provide the correct API reference for the UI5 version in use.
- **Code Validation:** To identify issues, **ALWAYS** use the `run_ui5_linter` tool. It detects deprecated APIs, accessibility issues, and other potential bugs.
- **Code Fixes:** To apply fixes suggested by the linter, always confirm with the user first. Then use the `fix` parameter of the `run_ui5_linter` tool. This will automatically correct _some_ of the identified issues. The tool can also provide context information that can be used to manually fix the remaining issues when tasked to do so.
- **Local Server Behavior:** When interacting with the UI5 CLI's development server, understand that it does **NOT** serve a default index file. You **MUST ALWAYS** reference files by their full path when using the browser (e.g., `http://localhost:8080/index.html`, not `http://localhost:8080/`).

## 3. CAP (Cloud Application Programming Model) Integration

When creating a new UI5 project within a CAP project, a specific set of rules apply to ensure seamless integration.

- **Project Location:** **ALWAYS** create UI5 projects within the `app/` directory of the CAP project root.
- **Service Information:**
  - If CDS tools are available to you, **ALWAYS** use them to get information about the definitions, services and their endpoints.
  - If no CDS tools are available to you, **ALWAYS** run `cds compile '*'` to get information about the definitions and `cds compile '*' --to serviceinfo` to get information about the services and their endpoints.
- **Service Integration:** When creating the UI5 project, **ALWAYS** provide the absolute OData V4 service URL and the target entity set when prompted by the tooling.
- **Plugin Installation:** **ALWAYS** run `npm i -D cds-plugin-ui5` in the CAP project root directory to ensure the latest version of `cds-plugin-ui5` is installed. This plugin automatically handles serving the UI5 applications.
- **Running the Server:**
    - **NEVER** run a separate `ui5 serve` or `npm start` command inside the UI5 project folder.
    - **ALWAYS** run `cds watch` (or `cds run`) from the **root** of the CAP project. This single command serves both the backend services and all UI5 applications.
- **Data Connection:**
    - **NEVER** configure a `ui5-middleware-simpleproxy` in the `ui5.yaml` file to connect to the local CAP service.
    - **Why:** The `cds watch` command ensures the UI and the service are served from the same origin (`http://localhost:4004`), making a proxy unnecessary.
- **Accessing the App:** Check the CAP launch page (typically `http://localhost:4004`) for a list of available services and links to the UI5 applications.
