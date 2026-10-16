import compression from "@fastify/compress";
import {
	StandardSchemaSerializerInterceptor,
	VersioningType,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, type TestingModule } from "@nestjs/testing";
import { AppModule } from "@src/app.module.js";
import { EnvService } from "@src/infra/config/env/env.service.js";
import { GlobalExceptionFilter } from "@src/infra/http/filters/global-exception.filter.js";
import { createStandardSchemaValidationPipe } from "@src/infra/http/pipes/standard-schema-validation.pipe.js";
import { resolveRequestId } from "@src/infra/http/utils/resolve-request-id.js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Infrastructure (E2E)", () => {
	let app: NestFastifyApplication;
	let moduleRef: TestingModule;

	beforeAll(async () => {
		moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		const adapter = new FastifyAdapter({
			requestIdHeader: false,
			genReqId: resolveRequestId,
			trustProxy: true,
		});

		adapter.getInstance().addHook("onSend", (req, reply, _payload, done) => {
			void reply.header("x-request-id", req.id);
			done();
		});

		app = moduleRef.createNestApplication<NestFastifyApplication>(adapter);

		const envService = app.get(EnvService);

		await app.register(compression);
		app.enableVersioning({ defaultVersion: "1", type: VersioningType.URI });
		app.enableCors();
		app.enableCsrfProtection();
		app.useSecurityHeaders();

		app.useGlobalPipes(createStandardSchemaValidationPipe());
		app.useGlobalInterceptors(
			new StandardSchemaSerializerInterceptor(app.get(Reflector)),
		);
		app.useGlobalFilters(new GlobalExceptionFilter(envService));

		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	describe("Security Headers", () => {
		it("should attach essential security headers (Helmet) to responses", async () => {
			const response = await request(app.getHttpServer()).get(
				"/v1/non-existent",
			);

			expect(response.headers).toHaveProperty(
				"x-content-type-options",
				"nosniff",
			);
			expect(response.headers).toHaveProperty("x-frame-options");
			expect(response.headers).toHaveProperty("x-xss-protection");
		});
	});

	describe("Request ID Propagation and Sanitization", () => {
		it("should generate a valid UUIDv7 x-request-id when none is supplied", async () => {
			const response = await request(app.getHttpServer()).get(
				"/v1/non-existent",
			);

			const reqId = response.headers["x-request-id"];
			expect(reqId).toBeDefined();
			expect(reqId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it("should echo back a clean, valid client-provided x-request-id", async () => {
			const customId = "client-trace-123456";

			const response = await request(app.getHttpServer())
				.get("/v1/non-existent")
				.set("x-request-id", customId);

			expect(response.headers["x-request-id"]).toBe(customId);
		});

		it("should sanitize illegal characters from client-provided x-request-id", async () => {
			const maliciousId = "trace-1;drop=table<script>?param=val";

			const response = await request(app.getHttpServer())
				.get("/v1/non-existent")
				.set("x-request-id", maliciousId);

			expect(response.headers["x-request-id"]).toBe(
				"trace-1droptablescriptparamval",
			);
		});
	});

	describe("Global Exception Filter", () => {
		it("should format 404 Not Found into standardized JSON envelope", async () => {
			const response = await request(app.getHttpServer()).get(
				"/v1/route-that-does-not-exist",
			);

			expect(response.status).toBe(404);
			expect(response.body).toEqual(
				expect.objectContaining({
					statusCode: 404,
					error: "Not Found",
					path: "/v1/route-that-does-not-exist",
				}),
			);
			expect(response.body.requestId).toBeDefined();
			expect(response.body.timestamp).toBeDefined();
		});
	});

	describe("Validation Pipe (Standard Schema)", () => {
		it("should reject invalid payloads with 400 and structured details array", async () => {
			const response = await request(app.getHttpServer())
				.post("/v1/auth/sign-in")
				.send({
					email: "not-an-email",
					password: "",
				});

			expect(response.status).toBe(400);
			expect(response.body).toEqual(
				expect.objectContaining({
					statusCode: 400,
					error: "VALIDATION_ERROR",
					message: "Validation failed",
				}),
			);
			expect(response.body.details).toBeInstanceOf(Array);
			expect(response.body.details.length).toBeGreaterThan(0);
		});
	});
});
