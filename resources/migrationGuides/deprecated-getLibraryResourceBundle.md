# Guide for Migrating `Core.getLibraryResourceBundle` to `Lib.getResourceBundleFor`

> *This guide provides instructions for AI-based development tools to perform a critical API migration in SAPUI5 projects. The focus is on replacing the deprecated call `sap.ui.getCore().getLibraryResourceBundle` with the modern API `Lib.getResourceBundleFor`.*

## 1. Core Concepts of the Migration

The legacy method `sap.ui.getCore().getLibraryResourceBundle` provided access to a library's resource bundle. This API is deprecated in favor of a new API located in the `sap/ui/core/Lib` module.

The migration involves three key changes:

1. **Switching Modules:** Instead of accessing the global `Core` object, the dedicated `sap/ui/core/Lib` module must be imported.
2. **Use the new API**: Replace any call of `sap.ui.getCore().getLibraryResourceBundle` with `Lib.getResourceBundleFor`.
3. **Mandatory Library Name:** The new API requires a library name. The old API would default to `"sap.ui.core"` if no argument was provided. This case must be handled explicitly during migration.

## 2. Migration Steps

To replace the module, follow these steps:

1. Import module `sap/ui/core/Lib` in the corresponding `sap.ui.define` dependency array.
2. Replace `sap.ui.getCore().getLibraryResourceBundle` with `Lib.getResourceBundleFor`.
    * **Explicitly Handle the Default Case:** If you encounter `getLibraryResourceBundle()` with no arguments, you **must** replace it with `Lib.getResourceBundleFor("sap.ui.core")`. Do not assume a default.
    * **Validate the Library Name:** The provided name must refer to a standard UI5 library that includes a `manifest.json` file. The API does not support resolving resource bundles for sub-components of libraries or arbitrary module paths.
    * Both APIs are synchronous, so no asynchronous handling needs to be added.

#### Example: Library Name is Provided

**Before:**

```js
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("myApp.controller.Main", {
        onSomeAction() {
            var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.m");
            var sText = oResourceBundle.getText("myI18nKey");
            // ...
        }
    });
});
```

**After:**

```js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Lib" // <-- Add new dependency
], (Controller, Lib) => { // <-- Add Lib to function arguments
    "use strict";

    return Controller.extend("myApp.controller.Main", {
        onSomeAction() {
            const oResourceBundle = Lib.getResourceBundleFor("sap.m");
            const sText = oResourceBundle.getText("myI18nKey");
            // ...
        }
    });
});
```
