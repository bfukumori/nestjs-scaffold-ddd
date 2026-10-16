import { userResponseSchema } from "@src/modules/users/infra/http/dtos/user-response.dto.js";
import { describe, expect, it } from "vitest";
import {
	signInResponseSchema,
	signInSchema,
	signUpSchema,
} from "./auth.schema.js";
import {
	emailSchema,
	verifyEmailResponseSchema,
	verifyEmailSchema,
} from "./email-verification.schema.js";
import {
	confirmMfaSchema,
	mfaConfirmResponseSchema,
	mfaEnrollResponseSchema,
	mfaVerifyResponseSchema,
	verifyMfaSchema,
} from "./mfa.schema.js";
import {
	passwordResetResponseSchema,
	passwordResetSchema,
} from "./password-reset.schema.js";
import {
	sessionItemSchema,
	sessionListResponseSchema,
} from "./sessions.schema.js";
import { refreshTokenSchema, tokenResponseSchema } from "./tokens.schema.js";

describe("HTTP DTO Schemas", () => {
	describe("auth.schema", () => {
		it("should validate valid signUp data", () => {
			const valid = { email: "user@example.com", password: "Password123!" };
			expect(signUpSchema.parse(valid)).toEqual(valid);
		});

		it("should validate valid signIn data", () => {
			const valid = { email: "user@example.com", password: "Password123!" };
			expect(signInSchema.parse(valid)).toEqual(valid);
		});

		it("should validate signInResponseSchema", () => {
			const valid = { mfaRequired: true };
			expect(signInResponseSchema.parse(valid)).toEqual(valid);
		});
	});

	describe("email-verification.schema", () => {
		it("should validate emailSchema", () => {
			const valid = { email: "valid@example.com" };
			expect(emailSchema.parse(valid)).toEqual(valid);
		});

		it("should validate verifyEmailSchema", () => {
			const valid = { token: "token_123" };
			expect(verifyEmailSchema.parse(valid)).toEqual(valid);
		});

		it("should validate verifyEmailResponseSchema", () => {
			const valid = {
				email: "valid@example.com",
				emailVerified: true as const,
			};
			expect(verifyEmailResponseSchema.parse(valid)).toEqual(valid);
		});
	});

	describe("mfa.schema", () => {
		it("should validate confirmMfaSchema", () => {
			const valid = { code: "123456" };
			expect(confirmMfaSchema.parse(valid)).toEqual(valid);
		});

		it("should validate verifyMfaSchema with code or recoveryCode", () => {
			expect(verifyMfaSchema.parse({ code: "123456" })).toEqual({
				code: "123456",
			});
			expect(verifyMfaSchema.parse({ recoveryCode: "rec_123" })).toEqual({
				recoveryCode: "rec_123",
			});
		});

		it("should fail verifyMfaSchema when neither code nor recoveryCode is given", () => {
			const result = verifyMfaSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("should validate mfaEnrollResponseSchema", () => {
			const valid = { secret: "SEC123", uri: "otpauth://totp/..." };
			expect(mfaEnrollResponseSchema.parse(valid)).toEqual(valid);
		});

		it("should validate mfaConfirmResponseSchema", () => {
			const valid = { recoveryCodes: ["code1", "code2"] };
			expect(mfaConfirmResponseSchema.parse(valid)).toEqual(valid);
		});

		it("should validate mfaVerifyResponseSchema", () => {
			const valid = { mfa: "verified" };
			expect(mfaVerifyResponseSchema.parse(valid)).toEqual(valid);
		});
	});

	describe("password-reset.schema", () => {
		it("should validate passwordResetSchema", () => {
			const valid = { token: "token_xyz", password: "NewPassword123!" };
			expect(passwordResetSchema.parse(valid)).toEqual(valid);
		});

		it("should validate passwordResetResponseSchema", () => {
			const valid = { mfaRequired: false };
			expect(passwordResetResponseSchema.parse(valid)).toEqual(valid);
		});
	});

	describe("tokens.schema", () => {
		it("should validate refreshTokenSchema", () => {
			const valid = { refreshToken: "refresh_xyz" };
			expect(refreshTokenSchema.parse(valid)).toEqual(valid);
		});

		it("should validate tokenResponseSchema", () => {
			const valid = {
				accessToken: "access_123",
				refreshToken: "refresh_123",
				tokenType: "bearer" as const,
				expiresIn: 900,
			};
			expect(tokenResponseSchema.parse(valid)).toEqual(valid);
		});
	});

	describe("sessions.schema", () => {
		it("should validate sessionItemSchema and sessionListResponseSchema", () => {
			const item = {
				id: "sess_1",
				createdAt: "2026-01-01T00:00:00.000Z",
				lastActiveAt: "2026-01-01T00:00:00.000Z",
				userAgent: "Mozilla/5.0",
				current: true,
			};
			expect(sessionItemSchema.parse(item)).toEqual(item);
			expect(sessionListResponseSchema.parse([item])).toEqual([item]);
		});
	});

	describe("userResponseSchema", () => {
		it("should validate userResponseSchema", () => {
			const valid = {
				id: "018e3d64-e69c-7a91-9e85-4db23c21a4f0",
				email: "user@example.com",
				role: "customer" as const,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};
			expect(userResponseSchema.parse(valid)).toEqual(valid);
		});
	});
});
