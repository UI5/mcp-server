import test from "ava";
import {createAppSchema} from "../../../../src/tools/create_ui5_app/schema.js";

test("appNamespace schema validation (positive)", (t) => {
	t.true(createAppSchema.appNamespace.safeParse("com.myorg.myapp").success, "valid namespace");
	t.true(createAppSchema.appNamespace.safeParse("my_app").success, "valid namespace with underscore");
	t.true(createAppSchema.appNamespace.safeParse("app123").success, "valid namespace with numbers");
	t.true(createAppSchema.appNamespace.safeParse("a").success, "valid single character namespace");
	t.true(createAppSchema.appNamespace.safeParse("a.b.c").success, "valid multi-part namespace");
});

test("appNamespace schema validation (negative)", (t) => {
	t.false(createAppSchema.appNamespace.safeParse("MyOrg.MyApp").success, "Uppercase characters are not allowed");
	t.false(createAppSchema.appNamespace.safeParse("_myapp").success, "Must not start with an underscore");
	t.false(createAppSchema.appNamespace.safeParse(".myapp").success, "Must not start with a dot");
	t.false(createAppSchema.appNamespace.safeParse("my-app").success, "Hyphens are not allowed");
	t.false(createAppSchema.appNamespace.safeParse("my app").success, "Spaces are not allowed");
	t.false(createAppSchema.appNamespace.safeParse("").success, "Empty string is not allowed");
});

test("frameworkVersion schema validation", (t) => {
	t.true(createAppSchema.frameworkVersion.safeParse("1.120.0").success, "valid version");
	t.false(createAppSchema.frameworkVersion.safeParse("1.120").success, "invalid version format");
	t.false(createAppSchema.frameworkVersion.safeParse("1.120.0-beta").success, "invalid version format");
});

test("author schema validation", (t) => {
	t.true(createAppSchema.author.safeParse("John Doe").success, "valid author");
	t.true(createAppSchema.author.safeParse("John.Doe").success, "valid author with dot");
	t.true(createAppSchema.author.safeParse("John-Doe").success, "valid author with hyphen");
	t.true(createAppSchema.author.safeParse("John_Doe").success, "valid author with underscore");
	t.true(createAppSchema.author.safeParse("John's Doe").success, "valid author with apostrophe");
	t.true(createAppSchema.author.safeParse("John@Doe").success, "valid author with at-symbol");
	t.false(createAppSchema.author.safeParse("John <Doe>").success, "invalid characters");
});

test("No oDataV4Url schema validation", (t) => {
	t.true(createAppSchema.oDataV4Url.safeParse("/odata/v4/service").success, "no restrictions in schema");
	t.true(createAppSchema.oDataV4Url.safeParse("/odata/v4/service<script>").success, "no restrictions in schema");
	t.true(createAppSchema.oDataV4Url.safeParse(`/odata/v4/service" onload=""`).success, "no restrictions in schema");
});

test("oDataEntitySet schema validation", (t) => {
	t.true(createAppSchema.oDataEntitySet.safeParse("MyEntitySet").success, "valid entity set");
	t.false(createAppSchema.oDataEntitySet.safeParse("My Entity Set").success, "spaces not allowed");
	t.false(createAppSchema.oDataEntitySet.safeParse("My-Entity-Set").success, "hyphens not allowed");
});

test("entityProperties schema validation", (t) => {
	t.true(createAppSchema.entityProperties.safeParse(["prop1", "prop2"]).success, "valid properties");
	t.false(createAppSchema.entityProperties.safeParse(["prop1", "prop 2"]).success, "spaces not allowed");
	t.false(createAppSchema.entityProperties.safeParse(["prop1", "prop-2"]).success, "hyphens not allowed");
});
