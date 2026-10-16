import type { IncomingHttpHeaders } from "node:http";
import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { resolveRequestId } from "./resolve-request-id.js";

function createMockRawRequest(
	headers: IncomingHttpHeaders = {},
): FastifyRequest["raw"] {
	return {
		headers,
	} as unknown as FastifyRequest["raw"];
}

describe("resolveRequestId", () => {
	it("should generate a UUIDv7 when x-request-id header is missing", () => {
		const req = createMockRawRequest({});

		const id = resolveRequestId(req);

		expect(id).toBeDefined();
		// UUID format: 8-4-4-4-12 hex characters
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});

	it("should generate a UUIDv7 when x-request-id header is empty or only whitespace", () => {
		const reqWithEmpty = createMockRawRequest({ "x-request-id": "" });
		const reqWithSpaces = createMockRawRequest({ "x-request-id": "   " });

		const id1 = resolveRequestId(reqWithEmpty);
		const id2 = resolveRequestId(reqWithSpaces);

		expect(id1).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(id2).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
	});

	it("should preserve valid alphanumeric, hyphen, and underscore characters", () => {
		const req = createMockRawRequest({
			"x-request-id": "client-req_12345ABC",
		});

		const id = resolveRequestId(req);

		expect(id).toBe("client-req_12345ABC");
	});

	it("should sanitize and strip illegal characters to prevent header and log injection", () => {
		const maliciousId =
			"req-123\r\nSet-Cookie: evil=true;<script>alert(1)</script>";
		const req = createMockRawRequest({
			"x-request-id": maliciousId,
		});

		const id = resolveRequestId(req);

		// Disallowed characters like \r, \n, :, =, <, >, /, (, ) should be completely removed
		expect(id).toBe("req-123Set-Cookieeviltruescriptalert1script");
	});

	it("should truncate request ID to maximum 64 characters to mitigate DoS / buffer issues", () => {
		const longId = "a".repeat(100);
		const req = createMockRawRequest({
			"x-request-id": longId,
		});

		const id = resolveRequestId(req);

		expect(id.length).toBe(64);
		expect(id).toBe("a".repeat(64));
	});

	it("should extract and sanitize the first element if x-request-id is an array of strings", () => {
		const req = createMockRawRequest({
			"x-request-id": [
				"first-id-valid",
				"second-id-ignored",
			] as unknown as string,
		});

		const id = resolveRequestId(req);

		expect(id).toBe("first-id-valid");
	});
});
