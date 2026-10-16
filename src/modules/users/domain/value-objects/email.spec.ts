import { InvalidEmailError } from "@src/modules/users/domain/errors/invalid-email.error.js";
import { describe, expect, it } from "vitest";
import { Email } from "./email.js";

describe("Email Value Object", () => {
	it("should create a valid email, trim whitespace and lowercase it", () => {
		const email = new Email("  Dev@TamagoLabs.COM.BR  ");

		expect(email.value).toBe("dev@tamagolabs.com.br");
		expect(email.toString()).toBe("dev@tamagolabs.com.br");
	});

	it("should throw InvalidEmailError when rawValue is null, undefined, empty, or not a string", () => {
		expect(() => new Email(null as unknown as string)).toThrow(
			InvalidEmailError,
		);
		expect(() => new Email(undefined as unknown as string)).toThrow(
			InvalidEmailError,
		);
		expect(() => new Email("")).toThrow(InvalidEmailError);
		expect(() => new Email("   ")).toThrow(InvalidEmailError);
		expect(() => new Email(12345 as unknown as string)).toThrow(
			InvalidEmailError,
		);
	});

	it("should throw InvalidEmailError when email exceeds 254 characters", () => {
		const longEmail = `${"a".repeat(250)}@example.com`;
		expect(() => new Email(longEmail)).toThrow(InvalidEmailError);
	});

	it("should throw InvalidEmailError when email format is invalid", () => {
		expect(() => new Email("plainaddress")).toThrow(InvalidEmailError);
		expect(() => new Email("@missingusername.com")).toThrow(InvalidEmailError);
		expect(() => new Email("username@.com")).toThrow(InvalidEmailError);
	});

	it("should correctly compare with another Email using equals", () => {
		const email1 = new Email("test@tamagolabs.com.br");
		const email2 = new Email("  TEST@tamagolabs.com.br  ");
		const email3 = new Email("other@tamagolabs.com.br");

		expect(email1.equals(email2)).toBe(true);
		expect(email1.equals(email3)).toBe(false);
		expect(email1.equals(null)).toBe(false);
		expect(email1.equals(undefined)).toBe(false);
		expect(email1.equals("test@tamagolabs.com.br" as unknown as Email)).toBe(
			false,
		);
	});
});
