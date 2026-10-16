import type { SignInService } from "@nestjs/authentication";
import type { CredentialsService } from "@src/modules/auth/application/services/credentials.service.js";
import { InvalidCredentialsError } from "@src/modules/auth/domain/errors/invalid-credentials.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller.js";

describe("AuthController", () => {
	let controller: AuthController;
	let credentialsService: {
		register: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};
	let signInService: {
		signIn: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		credentialsService = {
			register: vi.fn(),
			verify: vi.fn(),
		};
		signInService = {
			signIn: vi.fn(),
		};
		controller = new AuthController(
			credentialsService as unknown as CredentialsService,
			signInService as unknown as SignInService,
		);
	});

	describe("signUp", () => {
		it("should register new user, sign them in, and return HTTP dto", async () => {
			const mockUser = User.restore({
				id: "usr_signup_1",
				email: new Email("signup@example.com"),
				emailVerified: false,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			});

			credentialsService.register.mockResolvedValue(mockUser);
			signInService.signIn.mockResolvedValue({ session: { mfa: "none" } });

			const result = await controller.signUp({
				email: "signup@example.com",
				password: "ValidPassword123!",
			});

			expect(credentialsService.register).toHaveBeenCalledWith(
				"signup@example.com",
				"ValidPassword123!",
			);
			expect(signInService.signIn).toHaveBeenCalledWith("usr_signup_1", {
				method: "password",
			});
			expect(result).toEqual({
				id: "usr_signup_1",
				email: "signup@example.com",
				role: "customer",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			});
		});
	});

	describe("signIn", () => {
		it("should verify credentials and return mfaRequired true when mfa is pending", async () => {
			const mockUser = User.restore({
				id: "usr_signin_1",
				email: new Email("signin@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			credentialsService.verify.mockResolvedValue(mockUser);
			signInService.signIn.mockResolvedValue({
				session: { mfa: "pending" },
			});

			const result = await controller.signIn({
				email: "signin@example.com",
				password: "ValidPassword123!",
			});

			expect(result).toEqual({ mfaRequired: true });
			expect(signInService.signIn).toHaveBeenCalledWith("usr_signin_1", {
				method: "password",
			});
		});

		it("should return mfaRequired false when mfa is not pending", async () => {
			const mockUser = User.restore({
				id: "usr_signin_2",
				email: new Email("signin2@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			credentialsService.verify.mockResolvedValue(mockUser);
			signInService.signIn.mockResolvedValue({
				session: { mfa: "verified" },
			});

			const result = await controller.signIn({
				email: "signin2@example.com",
				password: "ValidPassword123!",
			});

			expect(result).toEqual({ mfaRequired: false });
		});

		it("should throw InvalidCredentialsError when credentials verification fails", async () => {
			credentialsService.verify.mockResolvedValue(null);

			await expect(
				controller.signIn({
					email: "signin@example.com",
					password: "WrongPassword!",
				}),
			).rejects.toThrow(InvalidCredentialsError);

			expect(signInService.signIn).not.toHaveBeenCalled();
		});
	});
});
