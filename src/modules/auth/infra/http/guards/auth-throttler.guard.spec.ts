import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import {
	ThrottlerGuard,
	type ThrottlerModuleOptions,
	type ThrottlerRequest,
	type ThrottlerStorage,
} from "@nestjs/throttler";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthThrottlerGuard } from "./auth-throttler.guard.js";

describe("AuthThrottlerGuard", () => {
	let guard: AuthThrottlerGuard;
	let storageService: { increment: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		storageService = {
			increment: vi.fn().mockResolvedValue({
				totalHits: 1,
				timeToExpire: 900,
				isBlocked: false,
				timeToBlockExpire: 0,
			}),
		};

		guard = new AuthThrottlerGuard(
			{} as ThrottlerModuleOptions,
			storageService as unknown as ThrottlerStorage,
			{} as Reflector,
		);
	});

	describe("getTracker", () => {
		it("should normalize the email and concatenate it with the IP when valid", async () => {
			const req = {
				ip: "192.168.1.10",
				body: { email: "  Bruno@TamagoLabs.com.br  " },
			};

			const tracker = await (
				guard as unknown as {
					getTracker(r: Record<string, unknown>): Promise<string>;
				}
			).getTracker(req);

			expect(tracker).toBe("bruno@tamagolabs.com.br|192.168.1.10");
		});

		it("should return only the IP if the email exceeds 254 characters (DoS protection)", async () => {
			const hugeEmail = `${"a".repeat(300)}@domain.com`;
			const req = {
				ip: "192.168.1.10",
				body: { email: hugeEmail },
			};

			const tracker = await (
				guard as unknown as {
					getTracker(r: Record<string, unknown>): Promise<string>;
				}
			).getTracker(req);

			expect(tracker).toBe("192.168.1.10");
		});

		it("should return only the IP when body is absent or email is not a string", async () => {
			const reqNoBody = { ip: "192.168.1.10" };
			const reqNumberEmail = { ip: "192.168.1.10", body: { email: 12345 } };
			const reqEmptyEmail = { ip: "192.168.1.10", body: { email: "   " } };

			const guardAccessor = guard as unknown as {
				getTracker(r: Record<string, unknown>): Promise<string>;
			};

			expect(await guardAccessor.getTracker(reqNoBody)).toBe("192.168.1.10");
			expect(await guardAccessor.getTracker(reqNumberEmail)).toBe(
				"192.168.1.10",
			);
			expect(await guardAccessor.getTracker(reqEmptyEmail)).toBe(
				"192.168.1.10",
			);
		});
	});

	describe("handleRequest (credential stuffing protection)", () => {
		it("should bypass burst protection when request has no email in body", async () => {
			const mockContext = {
				switchToHttp: () => ({
					getRequest: () => ({
						ip: "10.0.0.1",
						body: {},
					}),
					getResponse: () => ({ header: vi.fn() }),
				}),
			} as unknown as ExecutionContext;

			const superHandleSpy = vi
				.spyOn(
					ThrottlerGuard.prototype as unknown as {
						handleRequest: () => Promise<boolean>;
					},
					"handleRequest",
				)
				.mockResolvedValue(true);

			const requestProps: ThrottlerRequest = {
				context: mockContext,
				limit: 5,
				ttl: 900_000,
				throttler: { name: "default", limit: 5, ttl: 900_000 },
				blockDuration: 900_000,
				getTracker: vi.fn(),
				generateKey: (_ctx, tracker, name) => `${name}:${tracker}`,
			};

			const result = await (
				guard as unknown as {
					handleRequest(p: ThrottlerRequest): Promise<boolean>;
				}
			).handleRequest(requestProps);

			expect(result).toBe(true);
			expect(storageService.increment).not.toHaveBeenCalled();

			superHandleSpy.mockRestore();
		});
		it("should block the IP when a burst of attempts across multiple emails exceeds 4x the limit", async () => {
			const mockContext = {
				switchToHttp: () => ({
					getRequest: () => ({
						ip: "10.0.0.1",
						body: { email: "victim21@domain.com" },
					}),
					getResponse: () => ({ header: vi.fn() }),
				}),
			} as unknown as ExecutionContext;

			// Simulate the 21st attempt from the same IP (route limit = 5, burst = 20)
			storageService.increment.mockResolvedValueOnce({
				totalHits: 21,
				timeToExpire: 900,
				isBlocked: true,
				timeToBlockExpire: 900,
			});

			const throwSpy = vi
				.spyOn(
					guard as unknown as {
						throwThrottlingException: (...args: unknown[]) => Promise<void>;
					},
					"throwThrottlingException",
				)
				.mockRejectedValue(new Error("Too Many Requests"));

			const requestProps: ThrottlerRequest = {
				context: mockContext,
				limit: 5,
				ttl: 900_000,
				throttler: { name: "default", limit: 5, ttl: 900_000 },
				blockDuration: 900_000,
				getTracker: vi.fn(),
				generateKey: (_ctx, tracker, name) => `${name}:${tracker}`,
			};

			await expect(
				(
					guard as unknown as {
						handleRequest(p: ThrottlerRequest): Promise<boolean>;
					}
				).handleRequest(requestProps),
			).rejects.toThrow("Too Many Requests");

			expect(storageService.increment).toHaveBeenCalledWith(
				"default:ip-burst:10.0.0.1",
				900_000,
				20, // 5 * 4
				900_000,
				"default",
			);

			throwSpy.mockRestore();
		});

		it("should use the 'default' fallback when throttler.name is undefined", async () => {
			const mockContext = {
				switchToHttp: () => ({
					getRequest: () => ({
						ip: "10.0.0.1",
						body: { email: "user@tamagolabs.com.br" },
					}),
					getResponse: () => ({ header: vi.fn() }),
				}),
			} as unknown as ExecutionContext;

			const superHandleSpy = vi
				.spyOn(
					ThrottlerGuard.prototype as unknown as {
						handleRequest: () => Promise<boolean>;
					},
					"handleRequest",
				)
				.mockResolvedValue(true);

			const requestProps: ThrottlerRequest = {
				context: mockContext,
				limit: 5,
				ttl: 900_000,
				throttler: { limit: 5, ttl: 900_000 }, // name omitted (undefined)
				blockDuration: 900_000,
				getTracker: vi.fn(),
				generateKey: (_ctx, tracker, name) => `${name}:${tracker}`,
			};

			await (
				guard as unknown as {
					handleRequest(p: ThrottlerRequest): Promise<boolean>;
				}
			).handleRequest(requestProps);

			expect(storageService.increment).toHaveBeenCalledWith(
				"default:ip-burst:10.0.0.1",
				900_000,
				20,
				900_000,
				"default",
			);

			superHandleSpy.mockRestore();
		});
	});
});
