import { describe, expect, it } from "vitest";
import { envSchema } from "./env.schema.js";

describe("envSchema", () => {
	it("should parse valid environment configuration and apply defaults", () => {
		const rawConfig = {
			JWT_SECRET: "super-secret-key-12345",
		};

		const parsed = envSchema.parse(rawConfig);

		expect(parsed).toEqual({
			PORT: 3001,
			NODE_ENV: "development",
			APP_URL: "http://localhost:3000",
			JWT_SECRET: "super-secret-key-12345",
			SMTP_URL: undefined,
			TOTP_ENCRYPTION_KEY: undefined,
		});
	});

	it("should coerce PORT string to number", () => {
		const rawConfig = {
			PORT: "8080",
			JWT_SECRET: "super-secret-key-12345",
		};

		const parsed = envSchema.parse(rawConfig);

		expect(parsed.PORT).toBe(8080);
	});

	it("should allow valid optional values for SMTP_URL and TOTP_ENCRYPTION_KEY", () => {
		const rawConfig = {
			JWT_SECRET: "super-secret-key-12345",
			SMTP_URL: "smtp://mail.example.com:587",
			TOTP_ENCRYPTION_KEY: "totp-key-123",
			NODE_ENV: "production",
			APP_URL: "https://my-domain.com",
		};

		const parsed = envSchema.parse(rawConfig);

		expect(parsed.SMTP_URL).toBe("smtp://mail.example.com:587");
		expect(parsed.TOTP_ENCRYPTION_KEY).toBe("totp-key-123");
		expect(parsed.NODE_ENV).toBe("production");
		expect(parsed.APP_URL).toBe("https://my-domain.com");
	});

	it("should fail validation when JWT_SECRET is missing", () => {
		const rawConfig = {
			PORT: 3000,
		};

		const result = envSchema.safeParse(rawConfig);

		expect(result.success).toBe(false);
		if (!result.success) {
			const jwtIssue = result.error.issues.find(
				(issue) => issue.path.join(".") === "JWT_SECRET",
			);
			expect(jwtIssue).toBeDefined();
		}
	});

	it("should fail validation when NODE_ENV is invalid", () => {
		const rawConfig = {
			JWT_SECRET: "super-secret-key-12345",
			NODE_ENV: "staging",
		};

		const result = envSchema.safeParse(rawConfig);

		expect(result.success).toBe(false);
	});

	it("should fail validation when APP_URL is not a valid URL", () => {
		const rawConfig = {
			JWT_SECRET: "super-secret-key-12345",
			APP_URL: "not-a-valid-url",
		};

		const result = envSchema.safeParse(rawConfig);

		expect(result.success).toBe(false);
	});

	it("should fail validation when SMTP_URL is not a valid URL", () => {
		const rawConfig = {
			JWT_SECRET: "super-secret-key-12345",
			SMTP_URL: "invalid-smtp-url",
		};

		const result = envSchema.safeParse(rawConfig);

		expect(result.success).toBe(false);
	});
});
