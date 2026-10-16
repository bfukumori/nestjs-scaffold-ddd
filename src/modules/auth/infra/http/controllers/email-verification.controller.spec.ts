import type { EmailVerificationService } from "@nestjs/authentication";
import { EmailAlreadyInUseError } from "@src/modules/auth/domain/errors/email-already-in-use.error.js";
import { EmailAlreadyVerifiedError } from "@src/modules/auth/domain/errors/email-already-verified.error.js";
import { InvalidEmailLinkError } from "@src/modules/auth/domain/errors/invalid-email-link.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import type { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationController } from "./email-verification.controller.js";

describe("EmailVerificationController", () => {
	let controller: EmailVerificationController;
	let usersRepository: {
		findByEmail: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let emailVerificationService: {
		send: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		usersRepository = {
			findByEmail: vi.fn(),
			save: vi.fn().mockResolvedValue(undefined),
		};
		emailVerificationService = {
			send: vi.fn().mockResolvedValue(undefined),
			verify: vi.fn(),
		};

		controller = new EmailVerificationController(
			usersRepository as unknown as UsersRepository,
			emailVerificationService as unknown as EmailVerificationService,
		);
	});

	describe("changeEmail", () => {
		it("should return existing HTTP format if email is identical", async () => {
			const user = User.restore({
				id: "usr_1",
				email: new Email("same@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			});

			const result = await controller.changeEmail(user, {
				email: "same@example.com",
			});

			expect(result.email).toBe("same@example.com");
			expect(usersRepository.save).not.toHaveBeenCalled();
		});

		it("should throw EmailAlreadyInUseError if new email belongs to another user", async () => {
			const currentUser = User.restore({
				id: "usr_current",
				email: new Email("current@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const otherUser = User.restore({
				id: "usr_other",
				email: new Email("taken@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findByEmail.mockResolvedValue(otherUser);

			await expect(
				controller.changeEmail(currentUser, { email: "taken@example.com" }),
			).rejects.toThrow(EmailAlreadyInUseError);

			expect(usersRepository.save).not.toHaveBeenCalled();
		});

		it("should update email, save user and dispatch verification email", async () => {
			const currentUser = User.restore({
				id: "usr_current",
				email: new Email("current@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			});

			usersRepository.findByEmail.mockResolvedValue(null);

			const result = await controller.changeEmail(currentUser, {
				email: "brandnew@example.com",
			});

			expect(result.email).toBe("brandnew@example.com");
			expect(usersRepository.save).toHaveBeenCalledWith(currentUser);
			expect(emailVerificationService.send).toHaveBeenCalledWith({
				id: "usr_current",
				email: "brandnew@example.com",
			});
		});
	});

	describe("verify", () => {
		it("should verify token and return verified status", async () => {
			emailVerificationService.verify.mockResolvedValue({
				email: "verified@example.com",
			});

			const result = await controller.verify({ token: "valid_token_123" });

			expect(result).toEqual({
				email: "verified@example.com",
				emailVerified: true,
			});
		});

		it("should throw InvalidEmailLinkError when token verification returns falsy", async () => {
			emailVerificationService.verify.mockResolvedValue(null);

			await expect(
				controller.verify({ token: "invalid_or_expired_token" }),
			).rejects.toThrow(InvalidEmailLinkError);
		});
	});

	describe("resend", () => {
		it("should throw EmailAlreadyVerifiedError when user is already verified", async () => {
			const user = User.restore({
				id: "usr_verified",
				email: new Email("verified@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await expect(controller.resend(user)).rejects.toThrow(
				EmailAlreadyVerifiedError,
			);
			expect(emailVerificationService.send).not.toHaveBeenCalled();
		});

		it("should resend verification email when user is not verified", async () => {
			const user = User.restore({
				id: "usr_unverified",
				email: new Email("unverified@example.com"),
				emailVerified: false,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await controller.resend(user);

			expect(emailVerificationService.send).toHaveBeenCalledWith({
				id: "usr_unverified",
				email: "unverified@example.com",
			});
		});
	});
});
