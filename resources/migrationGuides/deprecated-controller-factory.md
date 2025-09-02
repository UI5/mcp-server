# Guide for Migrating the Deprecated `sap.ui.controller` Function

> *This guide provides instructions for AI-based development tools to perform a critical API migration in SAPUI5 projects. The focus is on replacing the deprecated `sap.ui.controller` with modern, asynchronous-friendly equivalents.*

## 1. Core Concepts of the Migration

The global function `sap.ui.controller` was used for two distinct purposes: defining a controller class and synchronously instantiating a controller. Both use cases are now deprecated and must be replaced to align with modern UI5 development standards, which emphasize Asynchronous Module Definition (AMD) for improved performance and modularity.

The migration path involves these primary steps:

1. **Adopt `sap.ui.define`:** All controller definitions must be wrapped in a `sap.ui.define` block. This ensures that dependencies, like the base controller, are loaded asynchronously before the controller module is executed.
2. **Import `sap/ui/core/mvc/Controller`:** The modern base class for all controllers must be explicitly imported.
3. **Choose the Correct Replacement:**
    * To **define a controller class**, use `Controller.extend()`. This is the most common use case and is typically found in `.controller.js` files.
    * To **create an instance of a controller** programmatically (a less common scenario), use the factory function `Controller.create()`. This function returns a `Promise`.

## 2. Migration Scenarios

### Scenario A: Defining a Controller Class (Most Common)

This scenario applies to the standard definition of a view's controller. The goal is to convert the old `sap.ui.controller()` definition into a modern AMD-style module that returns a controller class.

**Key Characteristics of "Before" Code:**

* Uses `sap.ui.controller('my.name.space.ControllerName', { ... });`
* The code is often in the global scope, not inside a `sap.ui.define`.
* Contains lifecycle methods like `onInit`, `onAfterRendering`, etc.

#### Migration Steps

1. Wrap the entire code in a `sap.ui.define` call.
2. Add `"sap/ui/core/mvc/Controller"` to the dependency array.
3. Pass a corresponding argument (e.g., `Controller`) to the factory function.
4. Replace `sap.ui.controller(...)` with `return Controller.extend(...)`.
5. It's a best practice to add `"use strict";` as the first statement inside the factory function. This should only be done if this practice is done in other controller files in the project.


#### Example: Controller Class Migration

**Before:**

```js
sap.ui.controller('myApp.controller.Main', {
    onInit: function () {
        // Initialization code
    },
    onPress: function () {
        // Button press handler
    },
});
```

**After:**

```js
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("myApp.controller.Main", {
        onInit() {
            // Initialization code
        },
        onPress() {
            // Button press handler
        },
    });
});
```

### Scenario B: Instantiating a Controller Programmatically

This is a rarer use case where a controller instance is created manually in application logic, often for use without a corresponding view (e.g., a "headless" controller for managing application-wide logic).

**Key Characteristics of "Before" Code:**

* Uses `var oController = sap.ui.controller('my.name.space.ControllerName');`
* The call is intended to immediately return a controller object.

#### Migration Steps

1. The modern replacement `Controller.create()` is **asynchronous** and returns a `Promise`. This is a critical change from the old synchronous API.
2. Any code that relies on the controller instance must be placed within an `async` function and use the `await` keyword, or use the `.then()` Promise chain.
3. The `Controller.create()` factory takes an object with a `name` property for the controller to be instantiated.

#### Example: Controller Instance Migration

**Before:**

```js
function createController() {
    return sap.ui.controller('myApp.controller.Main');
}
const oController = createController();
...
```

**After (using `async/await`):**

The calling code must be adapted to handle the asynchronous operation.

```js
async function createController() {
    return await Controller.create({name: "myApp.controller.Main"});
}
const oController = await createController();
...
```

### Important Considerations for the Agent

* **Do not confuse `extend` and `create`**. `extend` is for defining a controller class blueprint. `create` is for manufacturing an object from that blueprint. The vast majority of migrations will involve `Controller.extend`.
* **Respect Asynchronicity:** When encountering `Controller.create`, the agent must recognize the shift from synchronous to asynchronous programming. Simply replacing the call is not enough; the surrounding logic must be adapted to wait for the `Promise` to resolve. This might involve converting the enclosing function to an `async` function.
* **Base Controllers:** If a controller is already using `sap.ui.define` but extending a custom base controller, ensure the path to the base controller is correct in the dependency array and that the base controller itself is properly defined using `Controller.extend`.
* For more information, search the UI5 documentation for the topic "Controller".
