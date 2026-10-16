import type { PasswordResetService } from "@nestjs/authentication";
import { InvalidEmailLinkError } from "@src/modules/auth/domain/errors/invalid-email-link.error.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordResetController } from "./password-reset.controller.js";

describe("PasswordResetController", () => {
	let controller: PasswordResetController;
	let passwordResetService: {
		request: ReturnType<typeof vi.fn>;
		reset: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		passwordResetService = {
			request: vi.fn(),
			reset: vi.fn(),
		};
		controller = new PasswordResetController(
			passwordResetService as unknown as PasswordResetService,
		);
	});

	describe("forgot", () => {
		it("should trigger password reset request for the provided email", () => {
			controller.forgot({ email: "forgot@example.com" });

			expect(passwordResetService.request).toHaveBeenCalledWith(
				"forgot@example.com",
			);
		});
	});

	describe("reset", () => {
		it("should reset password and return mfaRequired true if session mfa is pending", async () => {
			passwordResetService.reset.mockResolvedValue({
				signedIn: { session: { mfa: "pending" } },
			});

			const result = await controller.reset({
				token: "valid_token",
				password: "NewPassword123!",
			});

			expect(passwordResetService.reset).toHaveBeenCalledWith(
				"valid_token",
				"NewPassword123!",
				{ signIn: true },
			);
			expect(result).toEqual({ mfaRequired: true });
		});

		it("should reset password and return mfaRequired false if session mfa is not pending", async () => {
			passwordResetService.reset.mockResolvedValue({
				signedIn: { session: { mfa: "none" } },
			});

			const result = await controller.reset({
				token: "valid_token",
				password: "NewPassword123!",
			});

			expect(result).toEqual({ mfaRequired: false });
		});

		it("should throw InvalidEmailLinkError if reset returns null", async () => {
			passwordResetService.reset.mockResolvedValue(null);

			await expect(
				controller.reset({
					token: "invalid_token",
					password: "NewPassword123!",
				}),
			).rejects.toThrow(InvalidEmailLinkError);
		});
	});
});
