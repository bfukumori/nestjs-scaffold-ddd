import type {
	EmailVerificationService,
	PasswordHasher,
} from "@nestjs/authentication";
import { EmailAlreadyInUseError } from "@src/modules/auth/domain/errors/email-already-in-use.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialsService } from "./credentials.service.js";

describe("CredentialsService", () => {
	let service: CredentialsService;
	let usersRepository: {
		findByEmail: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let passwordHasher: {
		hash: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
		needsRehash: ReturnType<typeof vi.fn>;
	};
	let emailVerificationService: {
		send: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		usersRepository = {
			findByEmail: vi.fn(),
			save: vi.fn().mockResolvedValue(undefined),
		};
		passwordHasher = {
			hash: vi.fn().mockResolvedValue("$argon2id$v=19$new_hash"),
			verify: vi.fn(),
			needsRehash: vi.fn().mockReturnValue(false),
		};
		emailVerificationService = {
			send: vi.fn().mockResolvedValue(undefined),
		};

		service = new CredentialsService(
			usersRepository as unknown as UsersRepository,
			passwordHasher as unknown as PasswordHasher,
			emailVerificationService as unknown as EmailVerificationService,
		);
	});

	describe("register", () => {
		it("should register a new user, send email verification, and save to the repository", async () => {
			usersRepository.findByEmail.mockResolvedValue(null);

			const user = await service.register(
				"dev@tamagolabs.com.br",
				"StrongPass123!",
			);

			expect(user.email.value).toBe("dev@tamagolabs.com.br");
			expect(usersRepository.save).toHaveBeenCalledWith(user);
			expect(emailVerificationService.send).toHaveBeenCalledWith({
				id: user.id,
				email: "dev@tamagolabs.com.br",
			});
		});

		it("should throw EmailAlreadyInUseError if the email already exists", async () => {
			const existing = User.restore({
				id: "usr_existing",
				email: new Email("dev@tamagolabs.com.br"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			usersRepository.findByEmail.mockResolvedValue(existing);

			await expect(
				service.register("dev@tamagolabs.com.br", "StrongPass123!"),
			).rejects.toThrow(EmailAlreadyInUseError);
			expect(usersRepository.save).not.toHaveBeenCalled();
		});
	});

	describe("verify (Rehash Regression)", () => {
		it("should update the hash when needsRehash is true", async () => {
			const existingUser = User.restore({
				id: "usr_rehash",
				email: new Email("dev@tamagolabs.com.br"),
				emailVerified: true,
				role: "customer",
				passwordHash: "$argon2id$v=19$old_weak_hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findByEmail.mockResolvedValue(existingUser);
			passwordHasher.verify.mockResolvedValue(true);
			passwordHasher.needsRehash.mockReturnValue(true);

			const result = await service.verify(
				"dev@tamagolabs.com.br",
				"StrongPass123!",
			);

			expect(result).not.toBeNull();
			expect(result?.passwordHash).toBe("$argon2id$v=19$new_hash");
			expect(usersRepository.save).toHaveBeenCalledWith(existingUser);
		});

		it("should return user without updating hash when needsRehash is false", async () => {
			const existingUser = User.restore({
				id: "usr_no_rehash",
				email: new Email("dev@tamagolabs.com.br"),
				emailVerified: true,
				role: "customer",
				passwordHash: "$argon2id$v=19$strong_hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findByEmail.mockResolvedValue(existingUser);
			passwordHasher.verify.mockResolvedValue(true);
			passwordHasher.needsRehash.mockReturnValue(false);

			const result = await service.verify(
				"dev@tamagolabs.com.br",
				"StrongPass123!",
			);

			expect(result).not.toBeNull();
			expect(result?.passwordHash).toBe("$argon2id$v=19$strong_hash");
			expect(passwordHasher.hash).not.toHaveBeenCalled();
			expect(usersRepository.save).not.toHaveBeenCalled();
		});

		it("should perform a dummy verify and return null when the email format is invalid (timing attack protection)", async () => {
			const result = await service.verify("invalid-email", "pass123");

			expect(result).toBeNull();
			expect(passwordHasher.verify).toHaveBeenCalledWith("pass123", null);
			expect(usersRepository.findByEmail).not.toHaveBeenCalled();
		});

		it("should return null when user is not found in repository", async () => {
			usersRepository.findByEmail.mockResolvedValue(null);
			passwordHasher.verify.mockResolvedValue(false);

			const result = await service.verify(
				"dev@tamagolabs.com.br",
				"WrongPass123!",
			);

			expect(result).toBeNull();
			expect(passwordHasher.verify).toHaveBeenCalledWith(
				"WrongPass123!",
				undefined,
			);
		});

		it("should return null when password does not match", async () => {
			const existingUser = User.restore({
				id: "usr_pass",
				email: new Email("dev@tamagolabs.com.br"),
				emailVerified: true,
				role: "customer",
				passwordHash: "$argon2id$v=19$valid_hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findByEmail.mockResolvedValue(existingUser);
			passwordHasher.verify.mockResolvedValue(false);

			const result = await service.verify(
				"dev@tamagolabs.com.br",
				"WrongPass123!",
			);

			expect(result).toBeNull();
			expect(passwordHasher.needsRehash).not.toHaveBeenCalled();
		});
	});
});
