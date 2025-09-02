import test from "ava";
import isValidUrl from "../../../../src/tools/create_ui5_app/isValidUrl.js";
import {InvalidInputError} from "../../../../src/utils.js";

test("should return false for non-string or empty input", (t) => {
	t.false(isValidUrl(""), "Empty string should be invalid");
});

test("should return false for malformed URL strings", (t) => {
	t.false(isValidUrl("not-a-url"), "String 'not-a-url' should be invalid");
	t.false(isValidUrl("https://"), "Incomplete URL should be invalid");
	t.false(isValidUrl("example.com"), "URL without a protocol should be invalid");
	t.false(isValidUrl("//example.com/path"), "Protocol-relative URL should be invalid by default");
});

test("should return true for a valid URL with no restrictions", (t) => {
	t.true(isValidUrl("https://example.com/path?query=value#hash"), "A full, valid URL should pass");
});

// --- Group 2: Protocol Allow List Validation ---

const httpsOnly = ["https"];

test("protocol: should return true when protocol is in the allow list", (t) => {
	t.true(isValidUrl("https://example.com", [], httpsOnly));
});

test("protocol: should return false when protocol is not in the allow list", (t) => {
	t.false(isValidUrl("http://example.com", [], httpsOnly), "http should be rejected");
	t.false(isValidUrl("ftp://example.com", [], httpsOnly), "ftp should be rejected");
});

test("protocol: should return true for any protocol when the allow list is empty", (t) => {
	t.true(isValidUrl("http://example.com", [], []), "http should be allowed with empty list");
	t.true(isValidUrl("ftp://example.com", [], []), "ftp should be allowed with empty list");
	t.true(isValidUrl("custom-protocol://example.com", [], []), "custom protocol should be allowed with empty list");
});

// --- Group 3: Domain Allow List Validation (Exact Match) ---

const exactDomains = ["example.com", "localhost"];

test("domain (exact): should return true when hostname is in the allow list", (t) => {
	t.true(isValidUrl("https://example.com", exactDomains));
	t.true(isValidUrl("http://localhost:3000/test", exactDomains), "localhost with a port should match");
});

test("domain (exact): should throw when hostname is not in the allow list", (t) => {
	t.throws(() => {
		return isValidUrl("https://other-domain.com", exactDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	});
});

test("domain (exact): should throw for subdomains when only the parent is allowed", (t) => {
	t.throws(() => {
		return isValidUrl("https://www.example.com", exactDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Subdomain should not match exactly");
	t.throws(() => {
		return isValidUrl("https://api.example.com", exactDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Another subdomain should not match exactly");
});

test("domain (exact): should return true for any domain when the allow list is empty", (t) => {
	t.true(isValidUrl("https://anything.goes.com/path", []));
});

// --- Group 4: Domain Allow List Validation (Wildcard Match) ---

const wildcardDomains = [".api.example.com", "localhost"];

test("domain (wildcard): should return true for direct and nested subdomains", (t) => {
	t.true(isValidUrl("https://customer1.api.example.com", wildcardDomains), "Direct subdomain should match");
	t.true(isValidUrl("https://v2.customer1.api.example.com", wildcardDomains), "Nested subdomain should match");
});

test("domain (wildcard): should throw for the root domain itself", (t) => {
	t.throws(() => {
		return isValidUrl("https://api.example.com", wildcardDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Root domain itself should not match wildcard");
});

test("domain (wildcard): should throw for a non-matching domain", (t) => {
	t.throws(() => {
		return isValidUrl("https://www.example.com", wildcardDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Different subdomain branch should not match");
});

test("domain (wildcard): should still allow exact matches from the same list", (t) => {
	t.true(isValidUrl("http://localhost", wildcardDomains), "Exact match for localhost should work");
	t.throws(() => {
		return isValidUrl("http://my-localhost", wildcardDomains);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Partial match for localhost should fail");
});

// --- Group 5: Combined Protocol and Domain Validation ---

const combinedProtocols = ["https"];
const combinedDomains = ["secure.example.com", ".internal.corp"];

test("combined: should return true when both protocol and domain are allowed", (t) => {
	t.true(isValidUrl("https://secure.example.com/login", combinedDomains, combinedProtocols));
	t.true(isValidUrl("https://api.internal.corp/v1/data", combinedDomains, combinedProtocols));
});

test("combined: should return false if protocol is disallowed", (t) => {
	t.false(
		isValidUrl("http://secure.example.com/login", combinedDomains, combinedProtocols),
		"Correct domain but wrong protocol should fail"
	);
});

test("combined: should throw if domain is disallowed", (t) => {
	t.throws(() => {
		return isValidUrl("https://example.com/login", combinedDomains, combinedProtocols);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Correct protocol but wrong domain should fail");
	t.throws(() => {
		return isValidUrl("https://internal.corp", combinedDomains, combinedProtocols);
	}, {
		message: /is not allowed/,
		instanceOf: InvalidInputError,
	}, "Root domain of wildcard is not allowed, should fail");
});

test("combined: should return false if both protocol and domain are disallowed", (t) => {
	t.false(
		isValidUrl("ftp://example.com/login", combinedDomains, combinedProtocols),
		"Both wrong protocol and wrong domain should fail"
	);
});
