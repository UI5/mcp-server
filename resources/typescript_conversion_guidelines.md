# UI5 TypeScript Conversion Guidelines

> *This document outlines how a UI5 (SAPUI5/OpenUI5) project can be converted to TypeScript. The first part explains how the setup of the project needs to be changed, the second part deals with converting the code itself.*


## General Conversion Rules

### Preserve ALL comments

You MUST preserve existing JSDoc, documentation and comments - never remove JSDoc or comments during the conversion.

Example input:

```js
/**
 * My cool controller, it does things.
 */
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
 * My cool controller, it does things.
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

### Be diligent

Carefully respect all guidelines in this document (and adapt appropriately where required). Before each conversion step, consider all relevant details from this document.

### Go step-by-step

You should convert the project step by step, starting with the TypeScript project setup and then the most central files on which other files depend, so those other files can use the typed version of those central files once they are converted as well. `"allowJs": true` in the `tsconfig.json`'s `compilerOptions` may be useful to run semi-converted projects if needed.

### Avoid `any` type

Do not take shortcuts, but try to find the proper type or create an interface instead of `any`.

BAD:
```ts
(this.getOwnerComponent() as any).getContentDensityClass();
```

GOOD:
```ts
(this.getOwnerComponent() as AppComponent).getContentDensityClass()
```

### Avoid `unknown` casts

Import and use actual UI5 control types instead (either the base class `sap/ui/core/Control` or more specific classes if needed to access the respective property). Inspect the XMLView to find out which control type you actually get when calling `this.byId(...)` in a controller!
Don't forget using the specific event types like e.g. `Route$PatternMatchedEvent` for routing events.

#### Casting Example
 
BAD:
```ts
(this.byId("form") as unknown as {setVisible: (v: boolean) => void}).setVisible(false);
```
 
GOOD:
 
```ts
import SimpleForm from "sap/ui/layout/form/SimpleForm";
(this.byId("form") as SimpleForm).setVisible(false);
```

### Create shared type definitions

Many type definitions you create are useful in different files. Create those in a central location like a file in in `src/types/`.


## Project Setup Conversion

### 1. package.json
You must add the following dev dependencies in the package.json file (very important) if they are not already present:

{{dependencies}}

However, if a dependency is already present in package.json, do not increase the major version number of it.
Do not remove existing dependencies, you must only add new configuration. Install the dependencies early to verify the types are found.

**IMPORTANT**: In addition, you **MUST** also add the `@sapui5/types` (or `@openui5/types`) package in a version matching the UI5 project as dev dependency. Framework type and version can be found in ui5.yaml or using the `get_project_info` MCP tool.

In addition, if (and ONLY if) dependencies or their versions changed, ensure (or tell the user) to execute npm install / yarn install (whatever is used in the project) to get the changed dependencies in the project.

The `typescript-eslint` dependency is only relevant when the project already has an eslint setup (details are below).

Also add the `"ts-typecheck": "tsc --noEmit"` script to `package.json`, so you and the developer can easily check for TypeScript errors.

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
		"types": ["@sapui5/types", "@types/jquery", "@types/qunit"],
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

### 4. Eslint configuration

Only when the project has eslint set up, enhance the eslint configuration with TypeScript-specific parts. If eslint is not set up with dependency in package.json and an eslint config, then do nothing.
A complete eslint v9 compatible `eslint.config.mjs` file could e.g. look like this, but the actual content depends on the specific project, so you MUST adapt it!

```js
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		ignores: ["eslint.config.mjs"]
	}
);
```


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
import Button from "sap/m/Button";
import Popup from "sap/ui/core/Popup";
 
const b: Button;
function getPopup(): Popup  { ... }
```
 
Hint: use the actual UI5 control events, not browser events like `Event` or `MouseEvent`, in event handlers of UI5 controls. UI5 events are different. E.g. use the `Button$PressEvent` and `Button$PressEventParameters` from the `sap/m/Button` module when the `press` event of the `sap/m/Button` is handled.

> Note: for any event XYZ of a UI5 control ABC, types like `ABC$XYZEvent` and `ABC$XYZEventParameters` are available!


Example:

Before:

```js
sap.ui.define(["./BaseController"], function (BaseController) {
    return BaseController.extend("my.app.controller.Main", {
        onPress: function(oEvent) {
            const button = oEvent.getSource();
        },
        
        onSelectionChange: function(oEvent) {
            const items = oEvent.getParameter("selectedItems");
        }
    });
});
```

After:

```ts
import BaseController from "./BaseController";
import Button from "sap/m/Button";
import {Button$PressEvent} from "sap/m/Button";
import {Table$RowSelectionChangeEvent} from "sap/ui/table/Table";

export default class Main extends BaseController {
    onPress(oEvent: Button$PressEvent): void {
        const button = oEvent.getSource() as Button;
    }
    
    onRowSelectionChange(oEvent: Table$RowSelectionChangeEvent): void {
        const selectedContext = oEvent.getParameter("rowContext");
    }
}
```

 
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
 
In the app controller example above, this step would add an additional import of the app's component (called `AppComponent`), so within the `onInit` implementation the required typecast can be done. Without this typecast, the return type of `getOwnerComponent` would be a `sap.ui.core.Component`, which does not have the `getContentDensityClass` method defined in the app component.
 
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


### Step 5: Solving any Remaining Issues
 
At this point, the number of remaining TypeScript errors should be vastly reduced.
If you clearly recognize some, fix them, but in case of doubt mention the last remaining issues to the developer.


## UI5 Control TypeScript Conversion Guidelines

> *This section covers the conversion of UI5 custom controls from JavaScript to TypeScript. This applies both to single custom controls within applications and to control libraries.*

Converting custom UI5 controls to TypeScript requires specific patterns in addition to the general TypeScript conversion (converting the proprietary UI5 class and syntax).

### The Runtime-Generated Methods Problem (CRITICAL)

**This is the most important aspect to understand.**

UI5 generates getter/setter (and more) methods for all properties, aggregations, associations, and events at **runtime**. This means TypeScript cannot see these methods at development time, causing type errors.

#### The Problem

In a control with a `text` property defined in metadata:

```typescript
static readonly metadata: MetadataOptions = {
    properties: {
        "text": "string"
    }
};
```

TypeScript will show errors when trying to use the generated methods:

```typescript
rm.text(control.getText());  // ERROR: Property 'getText' does not exist on type 'MyControl'
```

Additionally, TypeScript doesn't know the constructor signature structure for initializing controls:

```typescript
new MyControl("myId", {text: "Hello"}); // TypeScript doesn't know about the settings object structure
```

This affects:
- Property getters/setters: `getText()`, `setText()`, `bindText()`
- Aggregation methods: `addItem()`, `removeItem()`, `getItems()`, ...
- Association methods: `getLabel()`, `setLabel()`
- Event methods: `attachPress()`, `detachPress()`, `firePress()`
- Constructor settings object structure

#### The Solution: @ui5/ts-interface-generator

Install the interface generator tool as a dev dependency:

```sh
npm install --save-dev @ui5/ts-interface-generator@{{ts-interface-generator-version}}
```

To make subsequent development easier, add a script like this to `package.json`:

```json
{
    "scripts": {
        "watch:controls": "npx @ui5/ts-interface-generator --watch"
    }
}
```

NOTE: the tsconfig file related to the controls must be in the same directory in which the interface generator is launched. If you launch it in the root of your project and the tsconfig covering the TypeScript controls is in a subdirectory or has a different name than `tsconfig.json`, then call it like ` npx @ui5/ts-interface-generator --watch --config path/to/tsconfig.json`.

After TypeScript conversion of all controls, run the generator once to generate the needed control interfaces:

```bash
npm run watch:controls
```

This generates a `*.gen.d.ts` file (e.g., `MyControl.gen.d.ts`) containing TypeScript interfaces with all the runtime-generated methods. TypeScript merges these interfaces with the control class.

These generated files should be committed to version control and never edited manually.

#### Required Constructor Signatures (CRITICAL MANUAL STEP)

After running the interface generator, you must manually copy the constructor signatures from the terminal output into the respective control class.

The generator outputs something like:

```
===== BEGIN =====
// The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures 
constructor(id?: string | $MyControlSettings);
constructor(id?: string, settings?: $MyControlSettings);
constructor(id?: string, settings?: $MyControlSettings) { super(id, settings); }
===== END =====
```

**Copy these lines into the beginning of the class body**, before the metadata definition:

```typescript
export default class MyControl extends Control {
    // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures 
    constructor(id?: string | $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings) { super(id, settings); }

    static readonly metadata: MetadataOptions = {
        // ...
    };
}
```

### Control Metadata Typing

The control metadata must be typed as `MetadataOptions`:

```typescript
import type { MetadataOptions } from "sap/ui/core/Element";

export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: {
            "text": "string"
        }
    };
}
```

**Important points:**
- Import `MetadataOptions` from `sap/ui/core/Element` for controls (or closest base class - also available for `sap/ui/core/Object`, `sap/ui/core/ManagedObject`, and `sap/ui/core/Component`)
- Use `import type` instead of `import` (design-time only, no runtime impact)
- `MetadataOptions` available since UI5 1.110; use `object` for earlier versions
- Typing prevents issues when inheriting from the control (inherited properties should not be repeated)

### Namespace Annotation Required

The `@namespace` JSDoc annotation is **required** for the transformer to generate correct UI5 class names:

```typescript
/**
 * @namespace ui5.typescript.helloworld.control
 */
export default class MyControl extends Control {
    // ...
}
```

### Export Pattern

**Must use `export default` immediately when defining the class**, otherwise ts-interface-generator will fail:

```typescript
// CORRECT:
export default class MyControl extends Control {
    // ...
}

// WRONG - separate export:
class MyControl extends Control {
    // ...
}
export default MyControl;
```

### Static Members for Metadata and Renderer

Both metadata and renderer are defined as `static` class members:

```typescript
import RenderManager from "sap/ui/core/RenderManager";

export default class MyControl extends Control {
    static readonly metadata: MetadataOptions = {
        properties: {
            "text": "string"
        }
    };

    static renderer = {
        apiVersion: 2,
        render: function (rm: RenderManager, control: MyControl): void {
            rm.openStart("div", control);
            rm.openEnd();
            rm.text(control.getText());
            rm.close("div");
        }
    };
}
```

The renderer can also be in a separate file (common in libraries) and should in this case stay separate when converting to TypeScript.

The following JavaScript code:

```javascript
sap.ui.define([
    "sap/ui/core/Control",
    "./MyControlRenderer"
], function (Control, MyControlRenderer) {
    "use strict";

    return Control.extend("com.myorg.myapp.control.MyControl", {
        ...
        renderer: MyControlRenderer,
        ...
```

is then converted to this TypeScript code:

```typescript
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
import MyControlRenderer from "./MyControlRenderer";

/**
 * @namespace com.myorg.myapp.control
 */
export default class MyControl extends Control {
    ...
    static renderer = MyControlRenderer;
    ...
```

### Complete Control Example

#### JavaScript (Before):

```javascript
sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/RenderManager"
], function (Control, RenderManager) {
    "use strict";
    
    var MyControl = Control.extend("ui5.typescript.helloworld.control.MyControl", {
        metadata: {
            properties: {
                "text": "string"
            },
            events: {
                "press": {}
            }
        },
        
        renderer: function (rm, control) {
            rm.openStart("div", control);
            rm.openEnd();
            rm.text(control.getText());
            rm.close("div");
        },
        
        onclick: function() {
            this.firePress();
        }
    });

    return MyControl;
});
```

#### TypeScript (After):

```typescript
import Control from "sap/ui/core/Control";
import type { MetadataOptions } from "sap/ui/core/Element";
import RenderManager from "sap/ui/core/RenderManager";

/**
 * @namespace ui5.typescript.helloworld.control
 */
export default class MyControl extends Control {
    // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures 
    constructor(id?: string | $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings);
    constructor(id?: string, settings?: $MyControlSettings) { super(id, settings); }

    static readonly metadata: MetadataOptions = {
        properties: {
            "text": "string"
        },
        events: {
            "press": {}
        }
    };

    static renderer = {
        apiVersion: 2,
        render: function (rm: RenderManager, control: MyControl): void {
            rm.openStart("div", control);
            rm.openEnd();
            rm.text(control.getText());
            rm.close("div");
        }
    };

    onclick(): void {
        this.firePress();
    }
}
```

### Library-Specific Guidelines

When converting entire control libraries (not just single controls in apps), additional steps are required:

#### Library Module with Enums (CRITICAL to avoid XSS issues!)

In `library.ts`, enums must be attached to the global library object for UI5 runtime compatibility:

```typescript
import ObjectPath from "sap/base/util/ObjectPath";

// Define enum as TypeScript enum
export enum ExampleColor {
    Red = "Red",
    Green = "Green",
    Blue = "Blue"
}

// CRITICAL: Attach to global library object
const thisLib = ObjectPath.get("com.myorg.myui5lib") as {[key: string]: unknown};
thisLib.ExampleColor = ExampleColor;
```

**Why this is critical for every enum in the library:**
- Control properties reference types as global names: `type: "com.myorg.myui5lib.ExampleColor"`
- UI5 runtime needs to find the enum via this global path
- Without this, UI5 cannot validate the property type
- This breaks type checking and can create XSS vulnerabilities as unchecked content can be written to HTML unexpectedly


#### Path Mapping in tsconfig.json

For libraries, add path mappings for the library namespace:

```json
{
    "compilerOptions": {
        "paths": {
            "com/myorg/mylib/*": ["./src/*"]
        }
    }
}
```

### Control Conversion Checklist

When converting a control from JavaScript to TypeScript:

1. Convert to ES6 class/module like regular UI5 modules
2. Add `@namespace` JSDoc annotation
3. Use `export default` **immediately** with class definition
4. Type metadata as `MetadataOptions` (import from appropriate base class)
5. Define metadata and renderer as `static` members
6. Install and run `@ui5/ts-interface-generator`
7. Copy constructor signatures from generator output into class
8. If in a library: manually attach enums to global library object
9. Preserve all JSDoc comments and documentation


## Test Conversion

> *There are critical, non-obvious patterns for converting UI5 test code from JavaScript to TypeScript. Standard ES6 module/class conversions and renaming of files to `*.ts` also applies, like for regular application code and controls.*

NOTE: The test code file related changes below (especially those for OPA tests) always apply when converting the tests to TypeScript, but the test setup and running (like in `testsuite.qunit.ts`) may depend on how exactly the tests are set up in the project.

Test conversion should only happen once the rest of the application has been converted successfully.

### Explicit QUnit Import Required

Unlike JavaScript where QUnit is often used as a global, TypeScript requires explicit import:

```typescript
import QUnit from "sap/ui/thirdparty/qunit-2";
```

### Test Registration in testsuite.qunit.ts

The testsuite configuration uses plain `export default` (no sap.ui.define wrapper):

```typescript
export default {
    name: "Testsuite for the com/myorg/myapp app",
    defaults: {
        page: "ui5://test-resources/...",
        loader: {
            paths: {
                "com/myorg/myapp": "../",
                "integration": "./integration",
                "unit": "./unit"
            }
        }
    },
    tests: {
        "unit/unitTests": { title: "..." },
        "integration/opaTests": { title: "..." }
    }
};
```

### tsconfig.json Path Mappings for Tests

**Essential**: Add path mappings and QUnit types (like in this sample, but adapt to the specific app which is converted):

```json
{
    "compilerOptions": {
        "types": ["@sapui5/types", "@types/qunit"],
        "paths": {
            "com/myorg/myapp/*": ["./webapp/*"],
            "unit/*": ["./webapp/test/unit/*"],
            "integration/*": ["./webapp/test/integration/*"]
        }
    }
}
```

### OPA Integration Tests - Fundamental Architecture Change

JavaScript Pattern (OLD) - NOT USED IN TYPESCRIPT:

```javascript
sap.ui.define(["sap/ui/test/opaQunit", "./pages/App"], (opaTest) => {
    opaTest("should add an item", (Given, When, Then) => {
        Given.iStartMyApp();
        When.onTheAppPage.iEnterText("test");
        Then.onTheAppPage.iShouldSeeItem("test");
        Then.iTeardownMyApp();
    });
});
```

TypeScript Pattern (NEW) - MUST BE USED:

```typescript
import opaTest from "sap/ui/test/opaQunit";
import AppPage from "./pages/AppPage";
import QUnit from "sap/ui/thirdparty/qunit-2";

const onTheAppPage = new AppPage();

QUnit.module("Test Module");

opaTest("Should open dialog", function () {
    onTheAppPage.iStartMyUIComponent({
        componentConfig: { name: "ui5.typescript.helloworld" }
    });
    
    onTheAppPage.iPressButton();
    onTheAppPage.iShouldSeeDialog();
    onTheAppPage.iTeardownMyApp();
});
```

Critical Rules:
1. **NO Given/When/Then parameters** in the opaTest callback
2. **Create page instances BEFORE tests**: `const onTheAppPage = new AppPage();`
3. **Call all methods directly on the page instance** (arrangements, actions, assertions, cleanup)

### OPA Page Objects - Class-Based Only

JavaScript uses createPageObjects() - DO NOT USE IN TYPESCRIPT

TypeScript uses classes extending Opa5:

```typescript
import Opa5 from "sap/ui/test/Opa5";
import Press from "sap/ui/test/actions/Press";

const viewName = "ui5.typescript.helloworld.view.App";

export default class AppPage extends Opa5 {
    iPressButton() {
        return this.waitFor({
            id: "myButton",
            viewName,
            actions: new Press(),
            errorMessage: "Did not find button"
        });
    }
    
    iShouldSeeDialog() {
        return this.waitFor({
            controlType: "sap.m.Dialog",
            success: function () {
                Opa5.assert.ok(true, "Dialog is open");
            },
            errorMessage: "Did not find dialog"
        });
    }
}
```

Key Points:
- **NO createPageObjects()** - use ES6 class extending Opa5
- **NO separation** between actions and assertions objects. They are regular class methods
- All lifecycle methods (iStartMyUIComponent, iTeardownMyApp) are inherited from Opa5

### Arrangements Pattern - Eliminated

DO NOT create separate Arrangements classes in TypeScript.

JavaScript often uses:
```javascript
sap.ui.define(["sap/ui/test/Opa5"], (Opa5) => {
    return Opa5.extend("namespace.Startup", {
        iStartMyApp() { this.iStartMyUIComponent({...}); }
    });
});
```

TypeScript eliminates this - call `iStartMyUIComponent()` directly on the page instance in the journey.

### OPA Test Registration (opaTests.qunit.ts)

JavaScript typically has:
```javascript
sap.ui.define(["sap/ui/test/Opa5", "./arrangements/Startup", "./Journey1"], (Opa5, Startup) => {
    Opa5.extendConfig({ arrangements: new Startup(), autoWait: true });
});
```
TypeScript simplifies to:
```typescript
// import all your OPA tests here
import "integration/HelloJourney";
```

No Opa5.extendConfig() needed, just import the journeys.

### Code Coverage in case of using `ui5-test-runner`

If (and only if!) the tests are set up using the `ui5-test-runner` tool, then the app must be started with a specific `ui5-coverage.yaml` configuration. Suitable `package.json` scripts may look like this:

```
    "start-coverage": "ui5 serve --port 8080 --config ui5-coverage.yaml",
    ...
    "test-runner-coverage": "ui5-test-runner --url http://localhost:8080/test/testsuite.qunit.html --coverage -ccb 60 -ccf 100 -ccl 80 -ccs 80",
    "test-ui5": "ui5-test-runner --start start-coverage --url http://localhost:8080/test/testsuite.qunit.html --coverage -ccb 60 -ccf 100 -ccl 80 -ccs 80",
```

The `test-runner-coverage` script expects `start-coverage` to be executed manually, `test-ui5` does it automatically.

When adding such scripts, explain them to the user!

The `ui5-coverage.yaml` file must configure the `ui5-tooling-transpile-middleware` like this by adding the `babelConfig`:

```yaml
...
server:
  customMiddleware:
    - name: ui5-tooling-transpile-middleware
      afterMiddleware: compression
      configuration:
        debug: true
        babelConfig:
          sourceMaps: true
          ignore:
          - "**/*.d.ts"
          presets:
          - - "@babel/preset-env"
            - targets: defaults
          - - transform-ui5
          - "@babel/preset-typescript"
          plugins:
          - istanbul
    - name: ui5-middleware-livereload
      afterMiddleware: compression
```

In this case, the `babel-plugin-istanbul` package must be added as dev dependency! (The other packages in the config are already required by `ui5-tooling-transpile`).
