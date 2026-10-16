import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { describe, expect, it } from "vitest";
import type { UserPersistenceRow } from "../adapters/in-memory/in-memory-users.repository.js";
import { UserMapper } from "./user.mapper.js";

describe("UserMapper", () => {
	const fixedCreatedAt = new Date("2026-03-01T10:00:00.000Z");
	const fixedUpdatedAt = new Date("2026-03-01T12:00:00.000Z");

	const persistenceRow: UserPersistenceRow = {
		id: "usr_mapper_123",
		email: "mapper@example.com",
		emailVerified: true,
		role: "admin",
		passwordHash: "$argon2id$v=19$hashed_password",
		createdAt: fixedCreatedAt,
		updatedAt: fixedUpdatedAt,
	};

	it("should map persistence row to domain entity (toDomain)", () => {
		const domainUser = UserMapper.toDomain(persistenceRow);

		expect(domainUser).toBeInstanceOf(User);
		expect(domainUser.id).toBe("usr_mapper_123");
		expect(domainUser.email.value).toBe("mapper@example.com");
		expect(domainUser.emailVerified).toBe(true);
		expect(domainUser.role).toBe("admin");
		expect(domainUser.passwordHash).toBe("$argon2id$v=19$hashed_password");
		expect(domainUser.createdAt).toEqual(fixedCreatedAt);
		expect(domainUser.updatedAt).toEqual(fixedUpdatedAt);
	});

	it("should map domain entity to persistence row (toPersistence)", () => {
		const domainUser = User.restore({
			id: "usr_mapper_456",
			email: new Email("restore@example.com"),
			emailVerified: false,
			role: "customer",
			passwordHash: "$argon2id$v=19$restore_hash",
			createdAt: fixedCreatedAt,
			updatedAt: fixedUpdatedAt,
		});

		const row = UserMapper.toPersistence(domainUser);

		expect(row).toEqual({
			id: "usr_mapper_456",
			email: "restore@example.com",
			emailVerified: false,
			role: "customer",
			passwordHash: "$argon2id$v=19$restore_hash",
			createdAt: fixedCreatedAt,
			updatedAt: fixedUpdatedAt,
		});
	});

	it("should map domain entity to safe HTTP DTO (toHTTP) without exposing password hash", () => {
		const domainUser = User.restore({
			id: "usr_mapper_789",
			email: new Email("safe@example.com"),
			emailVerified: true,
			role: "staff",
			passwordHash: "super_secret_argon2_hash_never_leak",
			createdAt: fixedCreatedAt,
			updatedAt: fixedUpdatedAt,
		});

		const httpDto = UserMapper.toHTTP(domainUser);

		expect(httpDto).toEqual({
			id: "usr_mapper_789",
			email: "safe@example.com",
			role: "staff",
			createdAt: fixedCreatedAt.toISOString(),
			updatedAt: fixedUpdatedAt.toISOString(),
		});

		// Security check: passwordHash must NEVER be exposed in the HTTP DTO
		expect(httpDto).not.toHaveProperty("passwordHash");
		expect(JSON.stringify(httpDto)).not.toContain("super_secret_argon2");
	});
});
