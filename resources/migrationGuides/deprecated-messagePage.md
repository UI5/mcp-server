# Guide for Migrating the Deprecated `sap/m/MessagePage` Control

> *This guide provides instructions for AI-based development tools to migrate the deprecated `sap.m.MessagePage` to the modern and more flexible `sap.m.IllustratedMessage` control.*

## 1. Core Concept: From a Static Page to a Flexible Component

The `sap.m.MessagePage` was a monolithic control designed to display a full-screen message. It is deprecated in favor of `sap.m.IllustratedMessage`, which offers a more flexible and modern user experience.

The key differences are:
* **Illustrations over Icons:** `IllustratedMessage` uses rich SVG illustrations (`illustrationType`) instead of simple font icons (`icon`).
* **Structured Content:** Content is more structured. There is a dedicated slot for a description and an `additionalContent` aggregation for custom controls like buttons, which were previously handled by specific properties.
* **Flexibility:** `IllustratedMessage` is not a full "page" but a component that can be used more flexibly within various layouts.

## 2. Pre-Migration Analysis & Rules

Before modifying code, the agent must verify the migration's feasibility.

* **Rule 1: JavaScript Implementation Check**
    * **Condition:** The `MessagePage` has complex custom logic associated with it in the controller that goes beyond simple property setting or event handling (e.g., dynamically replacing aggregations).
    * **Action:** **Abort migration.** A complex implementation requires manual refactoring. This automated guide is intended for declaratively used or simply configured controls.

## 3. Property and Aggregation Mapping

This table provides the definitive mapping from `MessagePage` to `IllustratedMessage`. The agent must follow these rules precisely.

| Old `MessagePage` Property/Aggregation | New `IllustratedMessage` Property/Aggregation | Migration Rule / Action                                                                                                                                                                                            |
| :------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                | `title`                                       | **Direct Mapping:** Transfer the value directly.                                                                                                                                                                 |
| `text` & `description`                 | `description`                                 | **Combine:** Concatenate the `text` and `description` properties, separated by a newline (`\n`). If only one is present, use it directly. Set the result to the new `description`.                                  |
| `icon`                                 | `illustrationType`                            | **Semantic Mapping & Fallback:** Map the `sap-icon://` to a `sap.m.IllustratedMessageType` enum value. Use a generic fallback if no clear semantic match is found. See **Section 4** for mapping strategy. |
| `titleLevel`                           | (Does not exist)                              | **Remove:** This property has no equivalent and must be removed.                                                                                                                                                   |
| `showNavButton` & `navButtonPress`     | `additionalContent` aggregation               | **Create Button:** If `showNavButton` is `true` OR `navButtonPress` is defined, create a `sap.m.Button` inside the `additionalContent` aggregation. Assign the `navButtonPress` handler to the button's `press` event. |
| `buttons` (aggregation)      | `additionalContent` aggregation               | **Move Content:** Move any controls from the `buttons` aggregation directly into the `additionalContent` aggregation.                                                                                      |
| `customText` (aggregation)             | `additionalContent` aggregation               | **Move Content:** Move any controls from the `customText` aggregation directly into the `additionalContent` aggregation.                         |
| `customDescription` (aggregation)      | `additionalContent` aggregation               | **Move Content:** Move any controls from the `customDescription` aggregation directly into the `additionalContent` aggregation.                                                                                      |

## 4. Icon-to-Illustration Mapping Strategy

The `icon` property (`sap-icon://...`) does not have a one-to-one mapping to `illustrationType`. The agent must use the following strategy:

1. **Attempt Semantic Match:** Look for an illustration that matches the icon's meaning.
2. **Use Fallback:** If no clear match is found, use a generic, context-appropriate illustration as a fallback.

Use the `sap.m.IllustratedMessageType` enum to access the available illustrations. **Note:** In XML views, the string value of the enum needs to be used, e.g., `"sapIllus-Achievement"`.

The following is a table of commonly used illustration types and their string value

| Enum    | String Value  |
| :--------------------- | :------------------------ |
| sap.m.IllustratedMessageType.NoData   | `sapIllus-NoData` |
| sap.m.IllustratedMessageType.NoEntries   | `sapIllus-NoEntries` |
| sap.m.IllustratedMessageType.PageNotFound   | `sapIllus-PageNotFound` |
| sap.m.IllustratedMessageType.UnableToLoad   | `sapIllus-UnableToLoad` |
| sap.m.IllustratedMessageType.NoSearchResults   | `sapIllus-NoSearchResults` |
| sap.m.IllustratedMessageType.KeyTask  (indicates the success of a task)  | `sapIllus-KeyTask` |

Check the API reference of `sap.m.IllustratedMessageType` for the full list of available illustrations. Make sure not to use any that are marked as deprecated.

## 5. Migration Scenario: XML View

### Example

This comprehensive example demonstrates the combination of text and the creation of the navigation button.

**Before:**

```xml
<mvc:View
  xmlns="sap.m"
  xmlns:mvc="sap.ui.core.mvc">
    <MessagePage
        id="notFoundPage"
        title="{i18n>notFoundTitle}"
        text="{i18n>notFoundText}"
        description="{i18n>notFoundDescription}"
        icon="sap-icon://error"
        showNavButton="true"
        navButtonPress=".onNavBack" />
</mvc:View>
```

**After:**

```xml
<mvc:View
  xmlns="sap.m"
  xmlns:mvc="sap.ui.core.mvc">
    <IllustratedMessage
        id="notFoundPage"
        title="{i18n>notFoundTitle}"
        description="{i18n>notFoundText} {i18n>notFoundDescription}"
        illustrationType="sapIllus-NoData">
        <!-- The navigation button is now explicitly created in additionalContent -->
        <additionalContent>
            <Button text="{i18n>backButtonText}" press=".onNavBack" />
        </additionalContent>
    </IllustratedMessage>
</mvc:View>
```

## 6. Migration Scenario: JavaScript Instantiation

### Example

**Before:**

```javascript
sap.ui.define([
    "sap/m/MessagePage",
    "sap/ui/core/mvc/Controller"
], (MessagePage, Controller) => {
    "use strict";
    return Controller.extend("my.app.Controller", {
        createMyPage: function() {
            const oPage = new MessagePage({
                title: "An Error Occurred",
                text: "The requested data could not be loaded.",
                icon: "sap-icon://error",
                showNavButton: true,
                navButtonPress: this.onNavBack.bind(this)
            });
            return oPage;
        }
    });
});
```

**After:**

```javascript
sap.ui.define([
    "sap/m/IllustratedMessage",
    "sap/m/Button",
    "sap/m/library",
    "sap/ui/core/mvc/Controller"
], (IllustratedMessage, Button, mobileLibrary, Controller) => {
    "use strict";

    // For illustrationType enum
    const { IllustratedMessageType } = mobileLibrary;

    return Controller.extend("my.app.Controller", {
        createMyPage: function() {
            const oMessage = new IllustratedMessage({
                title: "An Error Occurred",
                description: "The requested data could not be loaded.", // text becomes description
                illustrationType: IllustratedMessageType.UnableToLoad // Mapped from icon
            });

            // Button is created and added to aggregation
            const oNavButton = new Button({
                text: "Back", // Note: text must be provided
                press: this.onNavBack.bind(this)
            });

            oMessage.addAdditionalContent(oNavButton);

            return oMessage;
        }
    });
});
```
