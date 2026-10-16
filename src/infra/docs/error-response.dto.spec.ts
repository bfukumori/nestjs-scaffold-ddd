import { describe, expect, it } from "vitest";
import { errorResponseSchema } from "./error-response.dto.js";

describe("errorResponseSchema", () => {
	it("should validate a valid error response payload without details", () => {
		const payload = {
			statusCode: 400,
			error: "BadRequestException",
			message: "Validation failed",
			path: "/v1/auth/sign-in",
			requestId: "req-123456",
			timestamp: "2026-10-16T20:00:00.000Z",
		};

		const parsed = errorResponseSchema.parse(payload);
		expect(parsed).toEqual(payload);
	});

	it("should validate an error response payload with details", () => {
		const payload = {
			statusCode: 422,
			error: "UnprocessableEntityException",
			message: "Business rule violation",
			path: "/v1/auth/email",
			requestId: "req-789012",
			timestamp: "2026-10-16T20:00:00.000Z",
			details: [{ field: "email", message: "Email already in use" }],
		};

		const parsed = errorResponseSchema.parse(payload);
		expect(parsed).toEqual(payload);
	});

	it("should reject when required fields are missing", () => {
		const invalid = {
			statusCode: 500,
			message: "Internal server error",
		};

		expect(() => errorResponseSchema.parse(invalid)).toThrow();
	});
});
