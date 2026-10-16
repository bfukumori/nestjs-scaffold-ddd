import { EmailAlreadyInUseError } from "@src/modules/auth/domain/errors/email-already-in-use.error.js";
import { EmailAlreadyVerifiedError } from "@src/modules/auth/domain/errors/email-already-verified.error.js";
import { InvalidCredentialsError } from "@src/modules/auth/domain/errors/invalid-credentials.error.js";
import { InvalidEmailLinkError } from "@src/modules/auth/domain/errors/invalid-email-link.error.js";
import { InvalidMfaCodeError } from "@src/modules/auth/domain/errors/invalid-mfa-code.error.js";
import { describe, expect, it } from "vitest";

describe("Auth Domain Errors", () => {
	it("should instantiate EmailAlreadyInUseError with CONFLICT kind and formatted message", () => {
		const error = new EmailAlreadyInUseError("test@example.com");

		expect(error.kind).toBe("CONFLICT");
		expect(error.name).toBe("EmailAlreadyInUseError");
		expect(error.message).toContain("test@example.com");
	});

	it("should instantiate EmailAlreadyVerifiedError with CONFLICT kind and formatted message", () => {
		const error = new EmailAlreadyVerifiedError("test@example.com");

		expect(error.kind).toBe("CONFLICT");
		expect(error.name).toBe("EmailAlreadyVerifiedError");
		expect(error.message).toContain("test@example.com");
	});

	it("should instantiate InvalidCredentialsError with UNAUTHORIZED kind", () => {
		const error = new InvalidCredentialsError();

		expect(error.kind).toBe("UNAUTHORIZED");
		expect(error.name).toBe("InvalidCredentialsError");
		expect(error.message).toBe("Invalid email or password");
	});

	it("should instantiate InvalidEmailLinkError with VALIDATION_ERROR kind", () => {
		const error = new InvalidEmailLinkError();

		expect(error.kind).toBe("VALIDATION_ERROR");
		expect(error.name).toBe("InvalidEmailLinkError");
		expect(error.message).toBe("Invalid or expired link");
	});

	it("should instantiate InvalidMfaCodeError with UNAUTHORIZED kind", () => {
		const error = new InvalidMfaCodeError();

		expect(error.kind).toBe("UNAUTHORIZED");
		expect(error.name).toBe("InvalidMfaCodeError");
		expect(error.message).toBe("Invalid code");
	});
});
