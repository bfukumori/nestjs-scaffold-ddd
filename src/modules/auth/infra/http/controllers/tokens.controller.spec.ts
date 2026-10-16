import type { TokenService } from "@nestjs/authentication";
import type { CredentialsService } from "@src/modules/auth/application/services/credentials.service.js";
import { InvalidCredentialsError } from "@src/modules/auth/domain/errors/invalid-credentials.error.js";
import { User } from "@src/modules/users/domain/entities/user.entity.js";
import { Email } from "@src/modules/users/domain/value-objects/email.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokensController } from "./tokens.controller.js";

describe("TokensController", () => {
	let controller: TokensController;
	let credentialsService: { verify: ReturnType<typeof vi.fn> };
	let tokenService: {
		issue: ReturnType<typeof vi.fn>;
		refresh: ReturnType<typeof vi.fn>;
		revoke: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		credentialsService = {
			verify: vi.fn(),
		};
		tokenService = {
			issue: vi.fn(),
			refresh: vi.fn(),
			revoke: vi.fn().mockResolvedValue(undefined),
		};

		controller = new TokensController(
			credentialsService as unknown as CredentialsService,
			tokenService as unknown as TokenService,
		);
	});

	describe("issue", () => {
		it("should verify credentials and issue new tokens", async () => {
			const mockUser = User.restore({
				id: "usr_token_1",
				email: new Email("token@example.com"),
				emailVerified: true,
				role: "customer",
				passwordHash: "hash",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			credentialsService.verify.mockResolvedValue(mockUser);
			tokenService.issue.mockResolvedValue({
				accessToken: "jwt_token_abc",
				refreshToken: "refresh_token_xyz",
			});

			const result = await controller.issue({
				email: "token@example.com",
				password: "ValidPass123!",
			});

			expect(result).toEqual({
				accessToken: "jwt_token_abc",
				refreshToken: "refresh_token_xyz",
			});
			expect(tokenService.issue).toHaveBeenCalledWith("usr_token_1", {
				method: "password",
				claims: { amr: ["pwd"] },
			});
		});

		it("should throw InvalidCredentialsError if verify fails", async () => {
			credentialsService.verify.mockResolvedValue(null);

			await expect(
				controller.issue({
					email: "token@example.com",
					password: "WrongPassword!",
				}),
			).rejects.toThrow(InvalidCredentialsError);

			expect(tokenService.issue).not.toHaveBeenCalled();
		});
	});

	describe("refresh", () => {
		it("should delegate to TokenService.refresh", () => {
			tokenService.refresh.mockReturnValue({
				accessToken: "new_jwt_token",
			});

			const result = controller.refresh({ refreshToken: "refresh_123" });

			expect(result).toEqual({ accessToken: "new_jwt_token" });
			expect(tokenService.refresh).toHaveBeenCalledWith("refresh_123");
		});
	});

	describe("revoke", () => {
		it("should delegate to TokenService.revoke", async () => {
			await controller.revoke({ refreshToken: "refresh_to_revoke" });

			expect(tokenService.revoke).toHaveBeenCalledWith("refresh_to_revoke");
		});
	});
});
