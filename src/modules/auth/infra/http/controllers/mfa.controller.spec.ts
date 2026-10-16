import type { MfaService, SignInService } from "@nestjs/authentication";
import { InvalidMfaCodeError } from "@src/modules/auth/domain/errors/invalid-mfa-code.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MfaController } from "./mfa.controller.js";

describe("MfaController", () => {
	let controller: MfaController;
	let mfaService: {
		enroll: ReturnType<typeof vi.fn>;
		generateRecoveryCodes: ReturnType<typeof vi.fn>;
	};
	let signInService: {
		confirmMfa: ReturnType<typeof vi.fn>;
		completeMfa: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mfaService = {
			enroll: vi.fn(),
			generateRecoveryCodes: vi.fn(),
		};
		signInService = {
			confirmMfa: vi.fn(),
			completeMfa: vi.fn(),
		};

		controller = new MfaController(
			mfaService as unknown as MfaService,
			signInService as unknown as SignInService,
		);
	});

	const mockUser = User.restore({
		id: "usr_mfa_1",
		email: new Email("mfa@example.com"),
		emailVerified: true,
		role: "customer",
		passwordHash: "hash",
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	describe("enroll", () => {
		it("should enroll MFA for the current user", () => {
			mfaService.enroll.mockReturnValue({
				secret: "secret_123",
				uri: "otpauth://...",
			});

			const result = controller.enroll(mockUser);

			expect(result).toEqual({ secret: "secret_123", uri: "otpauth://..." });
			expect(mfaService.enroll).toHaveBeenCalledWith(
				"usr_mfa_1",
				"mfa@example.com",
			);
		});
	});

	describe("replace", () => {
		it("should replace MFA enrollment for the current user", () => {
			mfaService.enroll.mockReturnValue({ secret: "new_secret_456" });

			const result = controller.replace(mockUser);

			expect(result).toEqual({ secret: "new_secret_456" });
			expect(mfaService.enroll).toHaveBeenCalledWith(
				"usr_mfa_1",
				"mfa@example.com",
				{ replace: true },
			);
		});
	});

	describe("confirm", () => {
		it("should confirm MFA and return generated recovery codes", async () => {
			signInService.confirmMfa.mockResolvedValue(true);
			mfaService.generateRecoveryCodes.mockResolvedValue(["code1", "code2"]);

			const result = await controller.confirm("usr_mfa_1", { code: "123456" });

			expect(result).toEqual({ recoveryCodes: ["code1", "code2"] });
			expect(signInService.confirmMfa).toHaveBeenCalledWith(
				"usr_mfa_1",
				"123456",
			);
		});

		it("should throw InvalidMfaCodeError when confirmation code is invalid", async () => {
			signInService.confirmMfa.mockResolvedValue(false);

			await expect(
				controller.confirm("usr_mfa_1", { code: "wrong_code" }),
			).rejects.toThrow(InvalidMfaCodeError);

			expect(mfaService.generateRecoveryCodes).not.toHaveBeenCalled();
		});
	});

	describe("verify", () => {
		it("should complete MFA and return updated MFA session status", async () => {
			signInService.completeMfa.mockResolvedValue({
				session: { mfa: "verified" },
			});

			const result = await controller.verify({ code: "654321" });

			expect(result).toEqual({ mfa: "verified" });
			expect(signInService.completeMfa).toHaveBeenCalledWith({
				code: "654321",
				recoveryCode: undefined,
			});
		});

		it("should throw InvalidMfaCodeError when completion fails", async () => {
			signInService.completeMfa.mockResolvedValue(null);

			await expect(controller.verify({ code: "wrong_code" })).rejects.toThrow(
				InvalidMfaCodeError,
			);
		});
	});
});
