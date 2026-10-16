import type {
	SessionRecord,
	SessionService,
	SignInService,
} from "@nestjs/authentication";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsController } from "./sessions.controller.js";

describe("SessionsController", () => {
	let controller: SessionsController;
	let sessionService: {
		list: ReturnType<typeof vi.fn>;
		revoke: ReturnType<typeof vi.fn>;
	};
	let signInService: {
		signOut: ReturnType<typeof vi.fn>;
		signOutEverywhere: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		sessionService = {
			list: vi.fn(),
			revoke: vi.fn(),
		};
		signInService = {
			signOut: vi.fn(),
			signOutEverywhere: vi.fn().mockResolvedValue(undefined),
		};

		controller = new SessionsController(
			sessionService as unknown as SessionService,
			signInService as unknown as SignInService,
		);
	});

	describe("list", () => {
		it("should list sessions and mark the current active session", async () => {
			const mockSessions = [
				{
					id: "sess_1",
					createdAt: new Date("2026-01-01"),
					lastActiveAt: new Date("2026-01-02"),
					metadata: { userAgent: "Mozilla/5.0" },
				},
				{
					id: "sess_2",
					createdAt: new Date("2026-01-03"),
					lastActiveAt: new Date("2026-01-04"),
					metadata: undefined,
				},
			];

			sessionService.list.mockResolvedValue(mockSessions);

			const currentSession = { id: "sess_1" } as SessionRecord;

			const result = await controller.list("usr_123", currentSession);

			expect(result).toEqual([
				{
					id: "sess_1",
					createdAt: new Date("2026-01-01"),
					lastActiveAt: new Date("2026-01-02"),
					userAgent: "Mozilla/5.0",
					current: true,
				},
				{
					id: "sess_2",
					createdAt: new Date("2026-01-03"),
					lastActiveAt: new Date("2026-01-04"),
					userAgent: null,
					current: false,
				},
			]);
		});
	});

	describe("revoke", () => {
		it("should revoke the specified session successfully", async () => {
			sessionService.revoke.mockResolvedValue(true);

			await controller.revoke("usr_123", "sess_target");

			expect(sessionService.revoke).toHaveBeenCalledWith("sess_target", {
				userId: "usr_123",
			});
		});

		it("should throw NotFoundException if session is not found or already revoked", async () => {
			sessionService.revoke.mockResolvedValue(false);

			await expect(
				controller.revoke("usr_123", "sess_unknown"),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("signOut", () => {
		it("should sign out successfully", async () => {
			signInService.signOut.mockResolvedValue(true);

			await controller.signOut();

			expect(signInService.signOut).toHaveBeenCalled();
		});

		it("should throw UnauthorizedException if signOut fails", async () => {
			signInService.signOut.mockResolvedValue(false);

			await expect(controller.signOut()).rejects.toThrow(UnauthorizedException);
		});
	});

	describe("signOutEverywhere", () => {
		it("should delegate to signInService.signOutEverywhere", async () => {
			await controller.signOutEverywhere("usr_123");

			expect(signInService.signOutEverywhere).toHaveBeenCalledWith("usr_123");
		});
	});
});
