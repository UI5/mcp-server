import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import type ODataMetadata from "../../../../src/tools/create_ui5_app/ODataMetadata.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	ODataMetadata: typeof ODataMetadata;
	fetchStub: sinonGlobal.SinonStub;
	logStub: {
		info: sinonGlobal.SinonStub;
	};
}>;

// Sample metadata XML converted to JSON structure as X2JS would produce
const sampleMetadataJson = {
	Edmx: {
		DataServices: {
			Schema: {
				Namespace: "NorthwindModel",
				EntityType: [
					{
						Name: "Product",
						Key: {
							PropertyRef: {
								Name: "ID",
							},
						},
						Property: [
							{
								Name: "ID",
								Type: "Edm.Int32",
							},
							{
								Name: "Name",
								Type: "Edm.String",
							},
							{
								Name: "Description",
								Type: "Edm.String",
							},
							{
								Name: "Price",
								Type: "Edm.Decimal",
							},
						],
					},
					{
						Name: "Category",
						Key: {
							PropertyRef: {
								Name: "ID",
							},
						},
						Property: [
							{
								Name: "ID",
								Type: "Edm.Int32",
							},
							{
								Name: "Name",
								Type: "Edm.String",
							},
						],
					},
				],
				EntityContainer: {
					EntitySet: [
						{
							Name: "Products",
							EntityType: "NorthwindModel.Product",
						},
						{
							Name: "Categories",
							EntityType: "NorthwindModel.Category",
						},
					],
				},
			},
		},
	},
};

// Sample metadata with multiple property refs in key
const multiKeyMetadataJson = {
	Edmx: {
		DataServices: {
			Schema: {
				Namespace: "NorthwindModel",
				EntityType: [
					{
						Name: "OrderDetail",
						Key: {
							PropertyRef: [
								{
									Name: "OrderID",
								},
								{
									Name: "ProductID",
								},
							],
						},
						Property: [
							{
								Name: "OrderID",
								Type: "Edm.Int32",
							},
							{
								Name: "ProductID",
								Type: "Edm.Int32",
							},
							{
								Name: "Quantity",
								Type: "Edm.Int32",
							},
						],
					},
				],
				EntityContainer: {
					EntitySet: [
						{
							Name: "OrderDetails",
							EntityType: "NorthwindModel.OrderDetail",
						},
					],
				},
			},
		},
	},
};

// Sample metadata with multiple schemas
const multiSchemaMetadataJson = {
	Edmx: {
		DataServices: {
			Schema: [
				{
					Namespace: "NorthwindModel",
					EntityType: [
						{
							Name: "Product",
							Key: {
								PropertyRef: {
									Name: "ID",
								},
							},
							Property: [
								{
									Name: "ID",
									Type: "Edm.Int32",
								},
								{
									Name: "Name",
									Type: "Edm.String",
								},
							],
						},
					],
					EntityContainer: {
						EntitySet: [
							{
								Name: "Products",
								EntityType: "NorthwindModel.Product",
							},
						],
					},
				},
				{
					Namespace: "SouthwindModel",
					EntityType: [
						{
							Name: "Customer",
							Key: {
								PropertyRef: {
									Name: "ID",
								},
							},
							Property: [
								{
									Name: "ID",
									Type: "Edm.Int32",
								},
								{
									Name: "Name",
									Type: "Edm.String",
								},
							],
						},
					],
					EntityContainer: {
						EntitySet: [
							{
								Name: "Customers",
								EntityType: "SouthwindModel.Customer",
							},
						],
					},
				},
			],
		},
	},
};

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	// Create stubs
	const fetchStub = t.context.sinon.stub();
	const logStub = {
		info: t.context.sinon.stub(),
	};

	// Mock the response object
	const mockResponse = new Response("<xml>mock</xml>", {
		status: 200,
		statusText: "OK",
	});
	fetchStub.resolves(mockResponse);

	// Mock XMLParser
	const xmlParserStub = t.context.sinon.stub().returns({
		parse: t.context.sinon.stub().returns(sampleMetadataJson),
	});

	// Import the module with mocked dependencies
	const {default: ODataMetadata} = await esmock(
		"../../../../src/tools/create_ui5_app/ODataMetadata.js", {
			"make-fetch-happen": fetchStub,
			"@ui5/logger": {
				getLogger: () => logStub,
			},
			"fast-xml-parser": {
				XMLParser: xmlParserStub,
			},
		}
	);

	t.context.ODataMetadata = ODataMetadata;
	t.context.fetchStub = fetchStub;
	t.context.logStub = logStub;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("ODataMetadata constructor processes entity types and entity sets", (t) => {
	const metadata = new t.context.ODataMetadata(sampleMetadataJson);

	// Check entity sets
	const entitySets = metadata.getEntitySets();
	t.deepEqual(entitySets, ["Categories", "Products"], "Entity sets are correctly extracted and sorted");

	// Check entity set details
	const productEntitySet = metadata.getEntitySet("Products");
	t.truthy(productEntitySet, "Product entity set exists");

	if (productEntitySet) {
		t.is(productEntitySet.namespace, "NorthwindModel", "Namespace is correct");
		t.is(productEntitySet.name, "Product", "Name is correct");
		t.deepEqual(productEntitySet.keys, ["ID"], "Keys are correct");
		t.is(productEntitySet.properties.length, 4, "Properties count is correct");
		t.deepEqual(
			productEntitySet.properties.map((p: {name: string; type: string}) => p.name),
			["ID", "Name", "Description", "Price"],
			"Property names are correct"
		);
		t.deepEqual(
			productEntitySet.properties.map((p: {name: string; type: string}) => p.type),
			["Edm.Int32", "Edm.String", "Edm.String", "Edm.Decimal"],
			"Property types are correct"
		);
	}
});

test.serial("ODataMetadata constructor handles multiple keys", (t) => {
	const {ODataMetadata} = t.context;

	const metadata = new ODataMetadata(multiKeyMetadataJson);

	// Check entity sets
	const entitySets = metadata.getEntitySets();
	t.deepEqual(entitySets, ["OrderDetails"], "Entity sets are correctly extracted");

	// Check entity set details
	const orderDetailEntitySet = metadata.getEntitySet("OrderDetails");
	t.truthy(orderDetailEntitySet, "OrderDetail entity set exists");

	if (orderDetailEntitySet) {
		t.deepEqual(orderDetailEntitySet.keys, ["OrderID", "ProductID"], "Multiple keys are correctly extracted");
	}
});

test.serial("ODataMetadata constructor handles multiple schemas", (t) => {
	const {ODataMetadata} = t.context;

	const metadata = new ODataMetadata(multiSchemaMetadataJson);

	// Check entity sets
	const entitySets = metadata.getEntitySets();
	t.deepEqual(
		entitySets,
		["Customers", "Products"],
		"Entity sets from multiple schemas are correctly extracted and sorted"
	);

	// Check entity set details from first schema
	const productEntitySet = metadata.getEntitySet("Products");
	t.truthy(productEntitySet, "Product entity set exists");
	if (productEntitySet) {
		t.is(productEntitySet.namespace, "NorthwindModel", "Namespace from first schema is correct");
	}

	// Check entity set details from second schema
	const customerEntitySet = metadata.getEntitySet("Customers");
	t.truthy(customerEntitySet, "Customer entity set exists");
	if (customerEntitySet) {
		t.is(customerEntitySet.namespace, "SouthwindModel", "Namespace from second schema is correct");
	}
});

test.serial("ODataMetadata.load fetches metadata from URL", async (t) => {
	// Setup fetch to return a successful response
	const mockResponse = {
		ok: true,
		status: 200,
		statusText: "OK",
		text: t.context.sinon.stub().resolves("<xml>metadata</xml>"),
	};
	t.context.fetchStub.resolves(mockResponse as unknown as Response);

	// Call the load method
	const metadata = await t.context.ODataMetadata.load("https://example.com/odata/");

	// Verify fetch was called with the correct URL
	t.is(t.context.fetchStub.callCount, 1, "fetch was called once");
	t.is(
		t.context.fetchStub.firstCall.args[0],
		"https://example.com/odata/$metadata",
		"fetch was called with the correct URL"
	);

	// Verify the metadata object was created
	t.truthy(metadata, "Metadata object was created");
});

test.serial("ODataMetadata.load handles 404 response", async (t) => {
	// Setup fetch to return a 404 response
	const mockResponse = {
		ok: false,
		status: 404,
		statusText: "Not Found",
		text: t.context.sinon.stub().resolves(""),
	};
	t.context.fetchStub.resolves(mockResponse as unknown as Response);

	// Call the load method
	const metadata = await t.context.ODataMetadata.load("https://example.com/odata/");

	// Verify fetch was called
	t.is(t.context.fetchStub.callCount, 1, "fetch was called once");

	// Verify the log message
	t.is(t.context.logStub.info.callCount, 1, "log.info was called once");
	t.true(
		t.context.logStub.info.firstCall.args[0].includes("does not exist"),
		"log message indicates resource does not exist"
	);

	// Verify no metadata object was created
	t.is(metadata, undefined, "No metadata object was created");
});

test.serial("ODataMetadata.load handles other HTTP errors", async (t) => {
	// Setup fetch to return a 500 response
	const mockResponse = {
		ok: false,
		status: 500,
		statusText: "Internal Server Error",
		text: t.context.sinon.stub().resolves(""),
	};
	t.context.fetchStub.resolves(mockResponse as unknown as Response);

	// Call the load method
	const metadata = await t.context.ODataMetadata.load("https://example.com/odata/");

	// Verify fetch was called
	t.is(t.context.fetchStub.callCount, 1, "fetch was called once");

	// Verify the log message
	t.is(t.context.logStub.info.callCount, 1, "log.info was called once");
	t.true(
		t.context.logStub.info.firstCall.args[0].includes("Unexpected response 500"),
		"log message indicates unexpected response"
	);

	// Verify no metadata object was created
	t.is(metadata, undefined, "No metadata object was created");
});

test.serial("ODataMetadata.load handles network errors", async (t) => {
	// Setup fetch to throw an error
	const error = new Error("Network error");
	t.context.fetchStub.rejects(error);

	// Call the load method
	const metadata = await t.context.ODataMetadata.load("https://example.com/odata/");

	// Verify fetch was called
	t.is(t.context.fetchStub.callCount, 1, "fetch was called once");

	// Verify the log message
	t.is(t.context.logStub.info.callCount, 1, "log.info was called once");
	t.true(
		t.context.logStub.info.firstCall.args[0].includes("Failed to load OData metadata"),
		"log message indicates failure to load metadata"
	);

	// Verify no metadata object was created
	t.is(metadata, undefined, "No metadata object was created");
});

test.serial("ODataMetadata.getKeys returns keys for an entity set", (t) => {
	const metadata = new t.context.ODataMetadata(sampleMetadataJson);

	// Get keys for Products entity set
	const keys = metadata.getKeys("Products");
	t.deepEqual(keys, ["ID"], "Keys are correctly returned");

	// Get keys for non-existent entity set
	const nonExistentKeys = metadata.getKeys("NonExistent");
	t.is(nonExistentKeys, undefined, "undefined is returned for non-existent entity set");
});

test.serial("ODataMetadata.getProperties returns properties for an entity set", (t) => {
	const metadata = new t.context.ODataMetadata(sampleMetadataJson);

	// Get properties for Products entity set
	const properties = metadata.getProperties("Products");
	t.deepEqual(properties, ["ID", "Name", "Description", "Price"], "Properties are correctly returned");

	// Get properties for non-existent entity set
	const nonExistentProperties = metadata.getProperties("NonExistent");
	t.is(nonExistentProperties, undefined, "undefined is returned for non-existent entity set");
});
