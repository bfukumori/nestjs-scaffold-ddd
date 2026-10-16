import type { IncomingHttpHeaders } from "node:http";
import { Test } from "@nestjs/testing";
import { EnvService } from "@src/infra/config/env/env.service.js";
import type { FastifyRequest } from "fastify";
import { Logger } from "nestjs-pino";
import { describe, expect, it, vi } from "vitest";
import { LoggerModule } from "./logger.module.js";

function getPinoParamsFactory(): (envService: EnvService) => {
	pinoHttp: Record<string, unknown>;
} {
	const imports = Reflect.getMetadata("imports", LoggerModule) as Array<{
		providers?: Array<{
			provide?: unknown;
			useFactory?: (envService: EnvService) => {
				pinoHttp: Record<string, unknown>;
			};
		}>;
	}>;
	const pinoDynamicModule = imports[0];
	const provider = pinoDynamicModule.providers?.find(
		(p) => p && typeof p === "object" && p.provide === "pino-params",
	);

	if (!provider?.useFactory) {
		throw new Error("Could not find pino-params useFactory provider");
	}

	return provider.useFactory;
}

describe("LoggerModule", () => {
	it("should compile the module and provide Logger", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [LoggerModule],
		})
			.overrideProvider(EnvService)
			.useValue({
				isDevelopment: false,
				get: vi.fn(),
			})
			.compile();

		const logger = moduleRef.get(Logger);
		expect(logger).toBeDefined();
		await moduleRef.close();
	});

	describe("pinoHttp configuration", () => {
		it("should configure redaction of sensitive credentials, info log level, and no pretty transport in production", async () => {
			const mockEnvService = {
				isDevelopment: false,
			} as unknown as EnvService;

			const factory = getPinoParamsFactory();
			const config = factory(mockEnvService);

			expect(config.pinoHttp.level).toBe("info");
			expect(config.pinoHttp.transport).toBeUndefined();
			expect(config.pinoHttp.customAttributeKeys).toEqual({
				reqId: "requestId",
			});
			expect(config.pinoHttp.redact).toEqual({
				paths: [
					"req.headers.authorization",
					"req.headers.cookie",
					"req.body.password",
					"req.body.newPassword",
					"req.body.token",
				],
				censor: "[CONFIDENTIAL]",
			});
		});

		it("should configure debug level and pino-pretty transport in development", async () => {
			const mockEnvService = {
				isDevelopment: true,
			} as unknown as EnvService;

			const factory = getPinoParamsFactory();
			const config = factory(mockEnvService);

			expect(config.pinoHttp.level).toBe("debug");
			expect((config.pinoHttp.transport as { target: string })?.target).toBe(
				"pino-pretty",
			);
		});

		describe("genReqId", () => {
			it("should extract string x-request-id header", async () => {
				const mockEnvService = {
					isDevelopment: false,
				} as unknown as EnvService;
				const factory = getPinoParamsFactory();
				const config = factory(mockEnvService);
				const genReqId = config.pinoHttp.genReqId as (
					req: FastifyRequest["raw"],
				) => string;

				const req = {
					headers: { "x-request-id": "client-id-abc" } as IncomingHttpHeaders,
				} as FastifyRequest["raw"];

				const reqId = genReqId(req);
				expect(reqId).toBe("client-id-abc");
			});

			it("should pick first element if x-request-id is an array", async () => {
				const mockEnvService = {
					isDevelopment: false,
				} as unknown as EnvService;
				const factory = getPinoParamsFactory();
				const config = factory(mockEnvService);
				const genReqId = config.pinoHttp.genReqId as (
					req: FastifyRequest["raw"],
				) => string;

				const req = {
					headers: {
						"x-request-id": ["array-id-1", "array-id-2"] as unknown as string,
					} as IncomingHttpHeaders,
				} as FastifyRequest["raw"];

				const reqId = genReqId(req);
				expect(reqId).toBe("array-id-1");
			});

			it("should fallback to unknown-req-id when header is missing", async () => {
				const mockEnvService = {
					isDevelopment: false,
				} as unknown as EnvService;
				const factory = getPinoParamsFactory();
				const config = factory(mockEnvService);
				const genReqId = config.pinoHttp.genReqId as (
					req: FastifyRequest["raw"],
				) => string;

				const req = {
					headers: {} as IncomingHttpHeaders,
				} as FastifyRequest["raw"];

				const reqId = genReqId(req);
				expect(reqId).toBe("unknown-req-id");
			});
		});
	});
});
