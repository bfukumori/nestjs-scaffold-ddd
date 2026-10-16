import { InvalidPasswordHashError } from "@src/modules/users/domain/errors/invalid-password-hash.error.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { describe, expect, it } from "vitest";
import { User } from "./user.entity.js";

describe("User Entity", () => {
	const validEmail = new Email("dev@tamagolabs.com.br");

	describe("create", () => {
		it("should create a new user with default role 'customer' and unverified email", () => {
			const user = User.create({
				id: "usr_123",
				email: validEmail,
				passwordHash: "argon_hash_1",
			});

			expect(user.id).toBe("usr_123");
			expect(user.email.value).toBe("dev@tamagolabs.com.br");
			expect(user.role).toBe("customer");
			expect(user.passwordHash).toBe("argon_hash_1");
			expect(user.emailVerified).toBe(false);
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.updatedAt).toBeInstanceOf(Date);
		});

		it("should create a new user with an explicit role", () => {
			const user = User.create({
				id: "usr_admin",
				email: validEmail,
				role: "admin",
				passwordHash: "argon_hash_admin",
			});

			expect(user.role).toBe("admin");
		});
	});

	describe("restore", () => {
		it("should restore an existing user preserving all properties", () => {
			const createdAt = new Date("2026-01-01T00:00:00.000Z");
			const updatedAt = new Date("2026-01-02T00:00:00.000Z");

			const user = User.restore({
				id: "usr_restored",
				email: validEmail,
				emailVerified: true,
				role: "staff",
				passwordHash: "existing_hash",
				createdAt,
				updatedAt,
			});

			expect(user.id).toBe("usr_restored");
			expect(user.emailVerified).toBe(true);
			expect(user.role).toBe("staff");
			expect(user.passwordHash).toBe("existing_hash");
			expect(user.createdAt).toEqual(createdAt);
			expect(user.updatedAt).toEqual(updatedAt);
		});
	});

	describe("updatePassword and rehashPassword", () => {
		it("should update password hash and touch updatedAt", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "old_hash",
			});

			user.updatePassword("new_strong_hash");

			expect(user.passwordHash).toBe("new_strong_hash");
		});

		it("should throw InvalidPasswordHashError when updating with empty or whitespace hash", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "old_hash",
			});

			expect(() => user.updatePassword("")).toThrow(InvalidPasswordHashError);
			expect(() => user.updatePassword("   ")).toThrow(
				InvalidPasswordHashError,
			);
		});

		it("should rehash password and touch updatedAt", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "old_hash",
			});

			user.rehashPassword("rehashed_password_hash");

			expect(user.passwordHash).toBe("rehashed_password_hash");
		});

		it("should throw InvalidPasswordHashError when rehashing with empty or whitespace hash", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "old_hash",
			});

			expect(() => user.rehashPassword("")).toThrow(InvalidPasswordHashError);
			expect(() => user.rehashPassword("   ")).toThrow(
				InvalidPasswordHashError,
			);
		});
	});

	describe("changeEmail", () => {
		it("should change email and reset emailVerified to false", () => {
			const user = User.restore({
				id: "usr_1",
				email: validEmail,
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const newEmail = new Email("newemail@tamagolabs.com.br");
			user.changeEmail(newEmail);

			expect(user.email.value).toBe("newemail@tamagolabs.com.br");
			expect(user.emailVerified).toBe(false);
		});

		it("should do nothing if changed to the exact same email", () => {
			const updatedAt = new Date("2026-01-01T00:00:00.000Z");
			const user = User.restore({
				id: "usr_1",
				email: validEmail,
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt,
			});

			user.changeEmail(new Email("dev@tamagolabs.com.br"));

			expect(user.emailVerified).toBe(true);
			expect(user.updatedAt).toEqual(updatedAt);
		});
	});

	describe("changeRole", () => {
		it("should change role and touch updatedAt", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "hash",
			});

			user.changeRole("admin");

			expect(user.role).toBe("admin");
		});

		it("should do nothing if role is the same", () => {
			const updatedAt = new Date("2026-01-01T00:00:00.000Z");
			const user = User.restore({
				id: "usr_1",
				email: validEmail,
				emailVerified: false,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt,
			});

			user.changeRole("customer");

			expect(user.role).toBe("customer");
			expect(user.updatedAt).toEqual(updatedAt);
		});
	});

	describe("markEmailAsVerified", () => {
		it("should mark email as verified", () => {
			const user = User.create({
				id: "usr_1",
				email: validEmail,
				passwordHash: "hash",
			});

			expect(user.emailVerified).toBe(false);
			user.markEmailAsVerified();
			expect(user.emailVerified).toBe(true);
		});

		it("should do nothing if email is already verified", () => {
			const updatedAt = new Date("2026-01-01T00:00:00.000Z");
			const user = User.restore({
				id: "usr_1",
				email: validEmail,
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt,
			});

			user.markEmailAsVerified();

			expect(user.emailVerified).toBe(true);
			expect(user.updatedAt).toEqual(updatedAt);
		});
	});
});
