import type {
	AuthenticationRegistry,
	SessionRecord,
} from "@nestjs/authentication";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import type { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionAuth } from "./session-auth.provider.js";

describe("SessionAuth", () => {
	let sessionAuth: SessionAuth;
	let usersRepository: { findById: ReturnType<typeof vi.fn> };
	let registry: { registerProvider: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		usersRepository = {
			findById: vi.fn(),
		};
		registry = {
			registerProvider: vi.fn(),
		};

		sessionAuth = new SessionAuth(
			usersRepository as unknown as UsersRepository,
			registry as unknown as AuthenticationRegistry,
		);
	});

	it("should register provider in AuthenticationRegistry", () => {
		expect(registry.registerProvider).toHaveBeenCalledWith(sessionAuth);
	});

	describe("validate", () => {
		it("should find and return the user matching session.userId", async () => {
			const mockUser = User.restore({
				id: "usr_session_1",
				email: new Email("session@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findById.mockResolvedValue(mockUser);

			const sessionRecord: SessionRecord = {
				id: "sess_123",
				userId: "usr_session_1",
				createdAt: new Date(),
				lastActiveAt: new Date(),
				expiresAt: new Date(Date.now() + 10000),
			};

			const result = await sessionAuth.validate(sessionRecord);

			expect(result).toBe(mockUser);
			expect(usersRepository.findById).toHaveBeenCalledWith("usr_session_1");
		});

		it("should return null when user is not found in repository", async () => {
			usersRepository.findById.mockResolvedValue(null);

			const sessionRecord: SessionRecord = {
				id: "sess_unknown",
				userId: "usr_non_existent",
				createdAt: new Date(),
				lastActiveAt: new Date(),
				expiresAt: new Date(Date.now() + 10000),
			};

			const result = await sessionAuth.validate(sessionRecord);

			expect(result).toBeNull();
		});
	});
});
