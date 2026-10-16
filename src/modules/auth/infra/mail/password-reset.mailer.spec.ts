import type {
	AuthenticationRegistry,
	PasswordResetLink,
	SignInService,
} from "@nestjs/authentication";
import type { Mailer } from "@nestjs/mail";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import type { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	PasswordResetMail,
	PasswordResetMailer,
} from "./password-reset.mailer.js";

describe("PasswordResetMailer", () => {
	let mailerHandler: PasswordResetMailer;
	let usersRepository: {
		findById: ReturnType<typeof vi.fn>;
		findByEmail: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let mailer: { send: ReturnType<typeof vi.fn> };
	let signInService: { signOutEverywhere: ReturnType<typeof vi.fn> };
	let registry: { registerHandler: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		usersRepository = {
			findById: vi.fn(),
			findByEmail: vi.fn(),
			save: vi.fn().mockResolvedValue(undefined),
		};
		mailer = {
			send: vi.fn().mockResolvedValue(undefined),
		};
		signInService = {
			signOutEverywhere: vi.fn().mockResolvedValue(undefined),
		};
		registry = {
			registerHandler: vi.fn(),
		};

		mailerHandler = new PasswordResetMailer(
			usersRepository as unknown as UsersRepository,
			mailer as unknown as Mailer,
			signInService as unknown as SignInService,
			registry as unknown as AuthenticationRegistry,
		);
	});

	it("should register handler in AuthenticationRegistry", () => {
		expect(registry.registerHandler).toHaveBeenCalledWith(
			"passwordReset",
			mailerHandler,
		);
	});

	describe("PasswordResetMail", () => {
		it("should render correct subject, template and context", () => {
			const mail = new PasswordResetMail();
			const link: PasswordResetLink = {
				userId: "usr_1",
				email: "dev@tamagolabs.com.br",
				url: "https://example.com/reset-password?token=abc",
				expiresAt: new Date(),
			};

			const rendered = mail.render(link);

			expect(rendered).toEqual({
				subject: "Reset your password",
				template: "password-reset",
				context: { url: "https://example.com/reset-password?token=abc" },
			});
		});
	});

	describe("findUser", () => {
		it("should return null when email string format is invalid", async () => {
			const result = await mailerHandler.findUser("invalid-email-address");

			expect(result).toBeNull();
			expect(usersRepository.findByEmail).not.toHaveBeenCalled();
		});

		it("should return null when user is not found in repository", async () => {
			usersRepository.findByEmail.mockResolvedValue(null);

			const result = await mailerHandler.findUser("nonexistent@example.com");

			expect(result).toBeNull();
		});

		it("should return user details when email exists", async () => {
			const user = User.restore({
				id: "usr_reset_1",
				email: new Email("user@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "$argon2id$v=19$current_hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findByEmail.mockResolvedValue(user);

			const result = await mailerHandler.findUser("user@example.com");

			expect(result).toEqual({
				id: "usr_reset_1",
				email: "user@example.com",
				passwordHash: "$argon2id$v=19$current_hash",
			});
		});
	});

	describe("send", () => {
		it("should dispatch password reset email via Mailer", async () => {
			const link: PasswordResetLink = {
				userId: "usr_1",
				email: "user@example.com",
				url: "https://example.com/reset?token=xyz",
				expiresAt: new Date(),
			};

			await mailerHandler.send(link);

			expect(mailer.send).toHaveBeenCalledWith(PasswordResetMail, {
				to: "user@example.com",
				data: link,
			});
		});
	});

	describe("updatePassword", () => {
		it("should update password, save user, and sign out of all active sessions (security protection)", async () => {
			const user = User.restore({
				id: "usr_reset_2",
				email: new Email("user2@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "$argon2id$v=19$old_hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findById.mockResolvedValue(user);

			await mailerHandler.updatePassword(
				"usr_reset_2",
				"$argon2id$v=19$brand_new_hash",
			);

			expect(user.passwordHash).toBe("$argon2id$v=19$brand_new_hash");
			expect(usersRepository.save).toHaveBeenCalledWith(user);
			expect(signInService.signOutEverywhere).toHaveBeenCalledWith(
				"usr_reset_2",
			);
		});

		it("should return early when user is not found", async () => {
			usersRepository.findById.mockResolvedValue(null);

			await mailerHandler.updatePassword("usr_unknown", "new_hash");

			expect(usersRepository.save).not.toHaveBeenCalled();
			expect(signInService.signOutEverywhere).not.toHaveBeenCalled();
		});
	});
});
