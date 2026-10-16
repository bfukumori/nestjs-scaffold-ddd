import type {
	AuthenticationRegistry,
	EmailVerificationLink,
} from "@nestjs/authentication";
import type { Mailer } from "@nestjs/mail";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import type { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	EmailVerificationMailer,
	VerifyEmailMail,
} from "./email-verification.mailer.js";

describe("EmailVerificationMailer", () => {
	let mailerHandler: EmailVerificationMailer;
	let usersRepository: {
		findById: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let mailer: { send: ReturnType<typeof vi.fn> };
	let registry: { registerHandler: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		usersRepository = {
			findById: vi.fn(),
			save: vi.fn().mockResolvedValue(undefined),
		};
		mailer = {
			send: vi.fn().mockResolvedValue(undefined),
		};
		registry = {
			registerHandler: vi.fn(),
		};

		mailerHandler = new EmailVerificationMailer(
			usersRepository as unknown as UsersRepository,
			mailer as unknown as Mailer,
			registry as unknown as AuthenticationRegistry,
		);
	});

	it("should register handler in AuthenticationRegistry", () => {
		expect(registry.registerHandler).toHaveBeenCalledWith(
			"emailVerification",
			mailerHandler,
		);
	});

	describe("VerifyEmailMail", () => {
		it("should render correct subject, template and context", () => {
			const mail = new VerifyEmailMail();
			const link: EmailVerificationLink = {
				userId: "usr_1",
				email: "dev@tamagolabs.com.br",
				url: "https://example.com/verify-email?token=xyz",
				expiresAt: new Date(),
			};

			const rendered = mail.render(link);

			expect(rendered).toEqual({
				subject: "Confirm your email address",
				template: "verify-email",
				context: { url: "https://example.com/verify-email?token=xyz" },
			});
		});
	});

	describe("send", () => {
		it("should dispatch verification email via Mailer", async () => {
			const link: EmailVerificationLink = {
				userId: "usr_1",
				email: "user@example.com",
				url: "https://example.com/verify?token=123",
				expiresAt: new Date(),
			};

			await mailerHandler.send(link);

			expect(mailer.send).toHaveBeenCalledWith(VerifyEmailMail, {
				to: "user@example.com",
				data: link,
			});
		});
	});

	describe("markVerified", () => {
		it("should mark user email as verified and save when user exists and email matches", async () => {
			const user = User.restore({
				id: "usr_verify_1",
				email: new Email("match@example.com"),
				emailVerified: false,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findById.mockResolvedValue(user);

			const result = await mailerHandler.markVerified(
				"usr_verify_1",
				"match@example.com",
			);

			expect(result).toBe(true);
			expect(user.emailVerified).toBe(true);
			expect(usersRepository.save).toHaveBeenCalledWith(user);
		});

		it("should return false when user is not found", async () => {
			usersRepository.findById.mockResolvedValue(null);

			const result = await mailerHandler.markVerified(
				"usr_nonexistent",
				"match@example.com",
			);

			expect(result).toBe(false);
			expect(usersRepository.save).not.toHaveBeenCalled();
		});

		it("should return false when email does not match user email", async () => {
			const user = User.restore({
				id: "usr_verify_2",
				email: new Email("original@example.com"),
				emailVerified: false,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findById.mockResolvedValue(user);

			const result = await mailerHandler.markVerified(
				"usr_verify_2",
				"different@example.com",
			);

			expect(result).toBe(false);
			expect(user.emailVerified).toBe(false);
			expect(usersRepository.save).not.toHaveBeenCalled();
		});
	});
});
