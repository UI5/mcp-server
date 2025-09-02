# Guide for Migrating `jQuery.sap.declare` and `jQuery.sap.require`

> *This guide provides instructions for AI-based development tools to migrate legacy SAPUI5 dependency management. The focus is on replacing the deprecated, synchronous functions `jQuery.sap.declare` and `jQuery.sap.require` with the modern, asynchronous `sap.ui.define` and `sap.ui.require` APIs. This migration is exclusively for JavaScript-based UI5 projects.*

## 1. Core Migration Principles

The legacy `jQuery.sap` namespace provided a synchronous way to declare modules and manage dependencies. This is now deprecated in favor of the standard Asynchronous Module Definition (AMD) syntax used by UI5, which improves performance and code modularity.

The migration follows these key principles:

1. **From `declare` to File-Based Modules:** `jQuery.sap.declare("my.module.name")` is obsolete. In modern UI5, the module's name is inferred from its path in the project structure. The `declare` statement should be removed entirely.
2. **From `require` to `define` Dependencies:** Dependencies, typically listed at the top of a file with `jQuery.sap.require(...)`, must be converted into an array of dependencies in a `sap.ui.define` call.
3. **Module Export:** The core object defined in the file (e.g., a controller, a helper class) must be the **return value** of the `sap.ui.define` factory function.
4. **Dependency Notation:** The module name notation must change from dot-separated (`"sap.m.Button"`) to path-separated (`"sap/m/Button"`).
5. **Dynamic Loading:** For dependencies required dynamically or conditionally (e.g. inside a function or if-clause), the global `jQuery.sap.require` is replaced by the asynchronous `sap.ui.require`.

For more information, search the UI5 documentation on the topic "Modules and Dependencies".

## 2. Pre-Migration Analysis: Rules for the Agent

Before modifying a file, the agent must perform these checks to prevent incorrect migrations:

* **Rule 1: Detect Existing `sap.ui.define`:**
    * **Condition:** The file already contains a `sap.ui.define` wrapper.
    * **Action:** Do **not** wrap the file again. Instead, find any remaining `jQuery.sap.require` calls within the file and merge their dependencies into the existing `sap.ui.define` array.
* **Rule 2: Identify a Single, Clear Module Export:**
    * **Condition:** The file contains multiple `jQuery.sap.declare` calls, or defines multiple distinct classes/objects at the top level (e.g., multiple `.extend` calls), or has no clear object to `return`.
    * **Action:** **Abort migration for this file.** These complex legacy files require manual review. A valid candidate for migration typically has one primary purpose, such as defining a single controller or helper class.
* **Rule 3: JavaScript Only:**
    * **Condition:** The project or file is identified as TypeScript (`.ts`).
    * **Action:** **Abort migration.** TypeScript uses standard ES module `import`/`export` syntax, and this migration logic does not apply.

## 3. Migration Scenarios

### Scenario A: Standard Module Definition (Most Common)

This scenario covers files that declare a single module and its static dependencies. The goal is to convert the entire file into a `sap.ui.define` block.

#### Example A.1: Legacy Module with `jQuery.sap.declare`

**Before:**

```js
jQuery.sap.declare("my.app.util.Formatter");
jQuery.sap.require("sap.ui.core.format.DateFormat");

my.app.util.Formatter = { // Note: This is an example of creating a global object
    formatDate: function(oDate) {
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance();
        return oDateFormat.format(oDate);
    }
};
```

**After:**

The migration wraps the code, converts the dependency, and returns the Formatter object.

```js
sap.ui.define([
    "sap/ui/core/format/DateFormat" // <-- Dependency converted to path notation
], (DateFormat) => { // <-- Dependency passed as argument
    "use strict";

    // The object is now returned instead of being assigned to a global variable
    return {
        formatDate(oDate) {
            const oDateFormat = DateFormat.getDateTimeInstance();
            return oDateFormat.format(oDate);
        }
    };
});
```

#### Example A.2: Legacy Controller Definition

**Before:**

```js
// Note: Some legacy files might omit jQuery.sap.declare
jQuery.sap.require("my.app.controller.BaseController");

my.app.controller.BaseController.extend("my.app.controller.Main", {
    onInit: function() {
      // [...]
    }
});
```

**After:**

The migration identifies the base class from the `.extend` call as a dependency.

```js
sap.ui.define([
    "my/app/controller/BaseController" // <-- Dependency from .extend()
], (BaseController) => {
    "use strict";

    // The result of the .extend() call is returned
    return BaseController.extend("my.app.controller.Main", {
        onInit() {
          // [...]
        }
    });
});
```

### Scenario B: Dynamic Dependency Loading

This scenario applies when `jQuery.sap.require` is used inside a function to load a dependency on demand. This must be replaced with the asynchronous `sap.ui.require`.

**Before:**

```js
// In some controller method...
onOpenDialog() {
    // Dependency is loaded synchronously just before it is needed
    jQuery.sap.require("sap.m.MessageBox");
    sap.m.MessageBox.show("This is a dynamically loaded message box!");
}
```

**After:**

The consuming function must be adapted to handle the asynchronous loading by using a callback.

```js
onOpenDialog() {
    // Use sap.ui.require with a callback
    sap.ui.require(["sap/m/MessageBox"], (MessageBox) => {
        MessageBox.show("This is a dynamically loaded message box!");
    });
}
```

## 4. Post-Migration Step: Re-run UI5 Linter

After the file is successfully wrapped in `sap.ui.define`, further detections as well as automated fixes may become possible.

**Action:** Execute the UI5 linter again, if requested before, with the auto-fix functionality enabled again. It can often resolve further issues now that a proper module definition is in place.
