import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./env.schema.js";
import { EnvService } from "./env.service.js";

describe("EnvService", () => {
	let envService: EnvService;
	let configService: { get: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		configService = {
			get: vi.fn(),
		};
		envService = new EnvService(
			configService as unknown as ConfigService<Env, true>,
		);
	});

	describe("get", () => {
		it("should delegate to ConfigService.get with { infer: true }", () => {
			configService.get.mockReturnValue("my-secret-key");

			const result = envService.get("JWT_SECRET");

			expect(result).toBe("my-secret-key");
			expect(configService.get).toHaveBeenCalledWith("JWT_SECRET", {
				infer: true,
			});
		});
	});

	describe("environment helper flags", () => {
		it("should identify production environment correctly", () => {
			configService.get.mockReturnValue("production");

			expect(envService.isProduction).toBe(true);
			expect(envService.isDevelopment).toBe(false);
			expect(envService.isTest).toBe(false);
		});

		it("should identify development environment correctly", () => {
			configService.get.mockReturnValue("development");

			expect(envService.isProduction).toBe(false);
			expect(envService.isDevelopment).toBe(true);
			expect(envService.isTest).toBe(false);
		});

		it("should identify test environment correctly", () => {
			configService.get.mockReturnValue("test");

			expect(envService.isProduction).toBe(false);
			expect(envService.isDevelopment).toBe(false);
			expect(envService.isTest).toBe(true);
		});
	});
});
