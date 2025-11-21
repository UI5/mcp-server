# UI5 TypeScript Conversion Guidelines

> *This document outlines how a UI5 (SAPUI5/OpenUI5) project can be converted to TypeScript. The first part explains how the setup of the project needs to be changed, the second part deals with converting the code itself.*

## Project Setup Conversion

### 1. package.json
You must add the following dependencies in the package.json file (very important) if they are not already present:

{{dependencies}}

However, if a dependency is already present in package.json, do not increase the major version number of it
Do not remove existing dependencies, you must only add new configuration.

In addition, if (and ONLY if) dependencies or their versions changed, ensure (or tell the user) to execute npm install / yarn install (whatever is used in the project) to get the changed dependencies in the project.

### 2. tsconfig.json

Add a tsconfig.json file. Use the following sample as reference, but adapt to the needs of the current project, e.g. adapt the paths map:

```json
{
	"compilerOptions": {
		"target": "es2023",
		"module": "es2022",
		"moduleResolution": "node",
		"skipLibCheck": true,
		"allowJs": true,
		"strict": true,
		"strictNullChecks": false,
		"strictPropertyInitialization": false,
		"outDir": "./dist",
		"rootDir": "./webapp",
		"types": ["@sapui5/types", "@types/qunit"],
		"paths": {
			"com/myorg/myapp/*": ["./webapp/*"],
			"unit/*": ["./webapp/test/unit/*"],
			"integration/*": ["./webapp/test/integration/*"]
		}
	},
	"exclude": ["./webapp/test/e2e/**/*"],
	"include": ["./webapp/**/*"]
}
```

### 3. ui5.yaml

Update the ui5.yaml file to use the `ui5-tooling-transpile-task` and `ui5-tooling-transpile-middleware` and ensure that at least the following config is present:

```yaml
builder:
  customTasks:
    - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
server:
  customMiddleware:
    - name: ui5-tooling-transpile-middleware
      afterMiddleware: compression
    - name: ui5-middleware-livereload
      afterMiddleware: compression
```

Ensure that the generated ui5.yaml file is valid - avoid duplicate entries, each root configuration must only exist once.
If a configuration like `server` already exists, you must add to it instead of adding a second entry.


## Application Code Conversion
 
### Step 1: Change proprietary UI5 class syntax to standard ES class syntax
 
Every UI5 class definitions (`SuperClass.extend(...)`) must be converted to a standard JavaScript `class`.
The properties in the UI5 class configuration object (second parameter of `extend`) become members of the standard JavaScript class.
It is important to annotate the class with the namespace in a JSDoc comment, so the back transformation can re-add it.
The namespace is the part of the full package+class name (first parameter of `extend`) that precedes the class name.
 
Before (example):
 
```js
[... other code, e.g. loading the dependencies "App", "Controller" etc. ...]
 
var App = Controller.extend("ui5tssampleapp.controller.App", {
    onInit: function _onInit() {
        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    }
});
```

 
After (example, do not use this code verbatim):
 
```js
[... other code, e.g. loading the dependencies "App", "Controller" etc. ...]
 
/**
* @namespace ui5tssampleapp.controller
*/
class App extends Controller {
    public onInit() {
        // apply content density mode to root view
        this.getView().addStyleClass((this.getOwnerComponent()).getContentDensityClass());
    };
};
```

 
### Step 2: Change to ECMAScript modules and imports
 
TypeScript UI5 apps must use modern ES modules and imports.
Hence, convert all UI5 module definition and dependency loading calls (`sap.ui.require(...)`, `sap.ui.define(...)`)
to ES modules with imports (and in case of `sap.ui.define` a module export).
 
In the above example, this looks as follows.
 
Before:
 
```js
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    /**
     * @namespace ui5tssampleapp.controller
     */
    class App extends Controller {
        ... // as above
    };
 
  return App;
});
```
 
After:
 
```js
import Controller from "sap/ui/core/mvc/Controller";
 
/**
* @namespace ui5tssampleapp.controller
*/
export default class App extends Controller {
    ... // as above
};
```
 
`sap.ui.require` shall be converted to just the imports and no export.
Avoid name clashes for the imported modules.
 
> Hint: importing `sap/ui/core/Core` does not provide the class (like for most other UI5 modules), but the singleton instance of the UI5 Core. So the imported module can be used directly for methods like `byId(...)` instead of calls to `sap.ui.getCore()` which return the singleton in JavaScript.

When `sap.ui.require` is used dynamically, e.g. `sap.ui.require(["sap/m/MessageBox"], function(MessageBox) { ... })` inside a method body, then convert this to a dynamic import like `import("sap/m/MessageBox").then((MessageBox) => { ... })`.
 
### Step 3: Standard TypeScript Code Adaptations
 
Apply your general knowledge about converting JavaScript code to TypeScript. In particular:
 
- Add type information to method parameters and variables where needed.
- Add missing private member class variables (with type information) to the beginning of the class definition. (In JavaScript they are often created later on-the-fly during the lifetime of a class instance.)
- Convert conventional `function`s to arrow functions when `someFunction.bind(...)` is used because TypeScript does not seem to propagate the type of the bound "this" context into the function body.
- Define further types and structures needed within the code, if applicable.
 
> IMPORTANT: whenever you use a UI5 type, e.g. for annotating a variable or method parameter/returntype, do NOT use the UI5 type with its global namespace (like `sap.m.Button` or `sap.ui.core.Popup`)! Instead, import this UI5 type from the respective module (like `sap/m/Button` or `sap/ui/core/Popup` - add an import if needed) and use the imported module.
 
Example:
 
Wrong:
```ts
const b: sap.m.Button;
function getPopup(): sap.ui.core.Popup  { ... }
```
 
Correct:
```ts
import Button from `sap/m/Button`;
import Popup from `sap/ui/core/Popup`;
 
const b: Button;
function getPopup(): Popup  { ... }
```
 
Hint: use the actual UI5 control events, not browser events like `Event` or `MouseEvent`, in event handlers of UI5 controls. UI5 events are different. E.g. use the `Button$PressEvent` and `Button$PressEventParameters` from the `sap/m/Button` module when the `press` event of the `sap/m/Button` is handled.

> Note: for any event XYZ of a UI5 control ABC, types like `ABC$XYZEvent` and `ABC$XYZEventParameters` are available!
 
Hint: use the most specific type which does provide all needed properties. Examples:
- Use specific types like `KeyboardEvent` or `MouseEvent`, not just `Event` for browser events.
- Use the `Button$PressEvent` from the `sap/m/Button` module, not the `sap/ui/base/Event`.
- The same is valid for all types, not only events.
 
 
### Step 4: Casts for Return Values of Generic Methods
 
Generic getter methods like `document.getElementById(...)` or `someUI5Control.getModel()` or inside a controller `this.byId()` return the super-type of all possible types (in the examples `HTMLElement` and `sap.ui.model.Model` and `sap.ui.core.Element`) although in practice it will usually be a specific sub-type (e.g. an `HTMLAnchorElement` or a `sap.ui.model.odata.v4.ODataModel` or a `sap.m.Input`).
 
In many cases you will have to cast the return value to the specific type to use it. The actual type can usually be derived from the context. If not, rather avoid the cast than guessing a wrong one. Also, do not cast to a superclass like `sap.ui.model.Model` when this is anyway the returned type.
 
The same is valid for several UI5 methods, most prominently the following:
- core.byId() / view.byId()
- control.getBinding()
- ownerComponent.getModel()
- event.getSource()
- component.getRootControl()  
- this.getOwnerComponent()
 
This cast will sometimes also require an additional module import to make the type (like `ODataModel` above) known.
 
In the app controller example above, this step would add an additional import of the app's component needed (called `AppComponent`), so within the `onInit` implementation the required typecast can be done. Without this typecast, the return type of `getOwnerComponent` would be a `sap.ui.core.Component`, which does not have the `getContentDensityClass` method defined in the app component.
 
Before:
```js
import Controller from "sap/ui/core/mvc/Controller";
 
/**
* @namespace ui5tssampleapp.controller
*/
export default class App extends Controller {
 
    public onInit() {
        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    };
 
};
```
 
After:
```ts
import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../Component";
 
/**
* @namespace ui5tssampleapp.controller
*/
export default class App extends Controller {
 
    public onInit() : void {
        // apply content density mode to root view
        this.getView().addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());
    };
 
};
```

 
(Note: the "void" definition of the method return type is not strictly demanded by TypeScript, but is beneficial e.g. depending on the linting settings.)


### 5. Solving any Remaining Issues
 
At this point, the number of remaining TypeScript errors should be vastly reduced.
If you clearly recognize some, fix them, but in case of doubt mention the last needed fixes to the developer.


### General Conversion Rules

You must preserve existing JSDoc, documentation and comments - never remove JSDoc or comments during the migration.

Example input:

```js
return Controller.extend("com.myorg.myapp.controller.BaseController", {
    /**
     * Convenience method for accessing the component of the controller's view.
     * @returns {sap.ui.core.Component} The component of the controller's view
     */
    getOwnerComponent: function () {
        // comment
        return Controller.prototype.getOwnerComponent.call(this);
    },
    ...
});
```

Wrong output:

```ts
export default class BaseController extends Controller {
    public getOwnerComponent(): UIComponent {
        return super.getOwnerComponent() as UIComponent;
    }
}
```

Correct output:

```ts
/**
 * @namespace com.myorg.myapp.controller
 */
export default class BaseController extends Controller {
    /**
     * Convenience method for accessing the component of the controller's view.
     * @returns {sap.ui.core.Component} The component of the controller's view
     */
    public getOwnerComponent(): UIComponent {
        // comment
        return super.getOwnerComponent() as UIComponent;
    }
}
```
