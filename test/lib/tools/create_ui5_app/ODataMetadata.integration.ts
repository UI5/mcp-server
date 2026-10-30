import test, {type ExecutionContext} from "ava";
import {createServer, type RequestListener} from "node:http";
import {once} from "node:events";
import type {AddressInfo} from "node:net";
import ODataMetadata from "../../../../src/tools/create_ui5_app/ODataMetadata.js";

const metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
	<edmx:DataServices>
		<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test">
			<EntityType Name="Product">
				<Key><PropertyRef Name="ID"/></Key>
				<Property Name="ID" Type="Edm.Int32"/>
			</EntityType>
			<EntityContainer Name="Container">
				<EntitySet Name="Products" EntityType="Test.Product"/>
			</EntityContainer>
		</Schema>
	</edmx:DataServices>
</edmx:Edmx>`;

async function serve(t: ExecutionContext, listener: RequestListener): Promise<URL> {
	const server = createServer(listener);
	t.teardown(() => new Promise<void>((resolve, reject) => {
		server.close((error) => error ? reject(error) : resolve());
		server.closeAllConnections();
	}));
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const {port} = server.address() as AddressInfo;
	return new URL(`http://127.0.0.1:${port}/`);
}

test("Load metadata from a loopback service", async (t) => {
	const requests: string[] = [];
	const url = await serve(t, (request, response) => {
		requests.push(request.url ?? "");
		response.end(metadataXml);
	});
	const metadata = await ODataMetadata.load(`${url}odata/`);
	t.deepEqual(requests, ["/odata/$metadata"]);
	t.deepEqual(metadata?.getEntitySets(), ["Products"]);
	t.deepEqual(metadata?.getKeys("Products"), ["ID"]);
});

for (const status of [301, 302, 303, 307, 308]) {
	test(`Do not follow HTTP ${status} to another service`, async (t) => {
		let targetRequests = 0;
		const targetUrl = await serve(t, (_request, response) => {
			targetRequests++;
			response.end(metadataXml);
		});
		let sourceRequests = 0;
		const sourceUrl = await serve(t, (_request, response) => {
			sourceRequests++;
			response.writeHead(status, {Location: `${targetUrl}odata/$metadata`});
			response.end();
		});
		t.is(await ODataMetadata.load(sourceUrl.toString()), undefined);
		t.is(sourceRequests, 1);
		t.is(targetRequests, 0);
	});
}

test("Do not follow relative redirects", async (t) => {
	const requests: string[] = [];
	const url = await serve(t, (request, response) => {
		requests.push(request.url ?? "");
		if (request.url === "/$metadata") {
			response.writeHead(302, {Location: "/redirected/$metadata"});
		}
		response.end(metadataXml);
	});
	t.is(await ODataMetadata.load(url.toString()), undefined);
	t.deepEqual(requests, ["/$metadata"]);
});
