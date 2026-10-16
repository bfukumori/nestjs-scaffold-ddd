import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "./in-memory-users.repository.js";

describe("InMemoryUsersRepository", () => {
	let repository: InMemoryUsersRepository;

	beforeEach(() => {
		repository = new InMemoryUsersRepository();
	});

	const createTestUser = (id = "usr_1", email = "test@tamagolabs.com.br") => {
		return User.restore({
			id,
			email: new Email(email),
			emailVerified: true,
			role: "customer",
			passwordHash: "$argon2id$v=19$hash123",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
	};

	it("should save and find a user by ID", async () => {
		const user = createTestUser("usr_save_1", "save1@example.com");

		await repository.save(user);
		const found = await repository.findById("usr_save_1");

		expect(found).not.toBeNull();
		expect(found?.id).toBe("usr_save_1");
		expect(found?.email.value).toBe("save1@example.com");
		expect(found?.emailVerified).toBe(true);
		expect(found?.role).toBe("customer");
	});

	it("should return null when finding by non-existent ID", async () => {
		const found = await repository.findById("non-existent-id");

		expect(found).toBeNull();
	});

	it("should find user by Email value object", async () => {
		const user = createTestUser("usr_email_1", "emailvo@example.com");
		await repository.save(user);

		const found = await repository.findByEmail(
			new Email("emailvo@example.com"),
		);

		expect(found).not.toBeNull();
		expect(found?.id).toBe("usr_email_1");
	});

	it("should find user by string email with case-insensitivity and whitespace trimming", async () => {
		const user = createTestUser("usr_case_1", "case@example.com");
		await repository.save(user);

		const found = await repository.findByEmail("  CASE@EXAMPLE.COM  ");

		expect(found).not.toBeNull();
		expect(found?.id).toBe("usr_case_1");
	});

	it("should return null when searching for unknown email", async () => {
		const found = await repository.findByEmail("unknown@example.com");

		expect(found).toBeNull();
	});

	it("should check existence of user by email", async () => {
		const user = createTestUser("usr_exists_1", "exists@example.com");
		await repository.save(user);

		expect(await repository.existsByEmail("exists@example.com")).toBe(true);
		expect(
			await repository.existsByEmail(new Email("exists@example.com")),
		).toBe(true);
		expect(await repository.existsByEmail("nonexistent@example.com")).toBe(
			false,
		);
	});

	it("should delete a user by ID", async () => {
		const user = createTestUser("usr_delete_1", "delete@example.com");
		await repository.save(user);

		await repository.delete("usr_delete_1");

		expect(await repository.findById("usr_delete_1")).toBeNull();
		expect(await repository.findByEmail("delete@example.com")).toBeNull();
	});
});
