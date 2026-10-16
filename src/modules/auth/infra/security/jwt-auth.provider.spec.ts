import type { AuthenticationRegistry } from "@nestjs/authentication";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import type { UsersRepository } from "@src/modules/users/domain/ports/users.repository.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JwtAuth } from "./jwt-auth.provider.js";

describe("JwtAuth", () => {
	let jwtAuth: JwtAuth;
	let usersRepository: { findById: ReturnType<typeof vi.fn> };
	let registry: { registerProvider: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		usersRepository = {
			findById: vi.fn(),
		};
		registry = {
			registerProvider: vi.fn(),
		};

		jwtAuth = new JwtAuth(
			usersRepository as unknown as UsersRepository,
			registry as unknown as AuthenticationRegistry,
		);
	});

	it("should register provider in AuthenticationRegistry with order 1", () => {
		expect(registry.registerProvider).toHaveBeenCalledWith(jwtAuth, {
			order: 1,
		});
	});

	describe("validate", () => {
		it("should find and return the user when sub is present in claims", async () => {
			const mockUser = User.restore({
				id: "usr_jwt_1",
				email: new Email("jwt@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			usersRepository.findById.mockResolvedValue(mockUser);

			const result = await jwtAuth.validate({ sub: "usr_jwt_1" });

			expect(result).toBe(mockUser);
			expect(usersRepository.findById).toHaveBeenCalledWith("usr_jwt_1");
		});

		it("should return null and not query repository when sub is undefined or empty", async () => {
			const resultUndefined = await jwtAuth.validate({
				sub: undefined as unknown as string,
			});
			const resultEmpty = await jwtAuth.validate({ sub: "" });

			expect(resultUndefined).toBeNull();
			expect(resultEmpty).toBeNull();
			expect(usersRepository.findById).not.toHaveBeenCalled();
		});

		it("should return null when user is not found in repository", async () => {
			usersRepository.findById.mockResolvedValue(null);

			const result = await jwtAuth.validate({ sub: "unknown_id" });

			expect(result).toBeNull();
		});
	});
});
