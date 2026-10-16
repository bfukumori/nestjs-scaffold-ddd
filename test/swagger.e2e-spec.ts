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
import { setupSwagger } from "@src/infra/docs/swagger.config.js";
import { GlobalExceptionFilter } from "@src/infra/http/filters/global-exception.filter.js";
import { createStandardSchemaValidationPipe } from "@src/infra/http/pipes/standard-schema-validation.pipe.js";
import { resolveRequestId } from "@src/infra/http/utils/resolve-request-id.js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Swagger Documentation (E2E)", () => {
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

		setupSwagger(app);

		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it("should serve the Swagger UI at /docs", async () => {
		const response = await request(app.getHttpServer()).get("/docs");

		expect(response.status).toBe(200);
		expect(response.headers["content-type"]).toContain("text/html");
		expect(response.text).toContain("Swagger UI");
	});

	it("should serve OpenAPI JSON specification at /docs/json with full schema definitions", async () => {
		const response = await request(app.getHttpServer()).get("/docs/json");

		expect(response.status).toBe(200);
		expect(response.headers["content-type"]).toContain("application/json");

		const spec = response.body;
		expect(spec.openapi).toBe("3.0.0");
		expect(spec.info.title).toBe("NestJS Scaffold DDD");
		expect(spec.info.version).toBe("1.0");

		// Security schemes
		expect(spec.components?.securitySchemes).toHaveProperty("bearer");
		expect(spec.components?.securitySchemes).toHaveProperty("session");

		// Tags
		const tagNames = spec.tags.map((t: { name: string }) => t.name);
		expect(tagNames).toContain("Auth");
		expect(tagNames).toContain("Auth - Email");
		expect(tagNames).toContain("Auth - MFA");
		expect(tagNames).toContain("Auth - Password");
		expect(tagNames).toContain("Auth - Sessions");
		expect(tagNames).toContain("Auth - Tokens");
		expect(tagNames).toContain("Users");

		// Paths with URI versioning (/v1/...)
		expect(spec.paths).toHaveProperty("/v1/auth/sign-up");
		expect(spec.paths).toHaveProperty("/v1/auth/sign-in");
		expect(spec.paths).toHaveProperty("/v1/auth/token");
		expect(spec.paths).toHaveProperty("/v1/auth/sessions");
		expect(spec.paths).toHaveProperty("/v1/me");

		// Check /v1/auth/sign-up schema
		const signUpPost = spec.paths["/v1/auth/sign-up"].post;
		expect(signUpPost.tags).toContain("Auth");
		expect(
			signUpPost.requestBody.content["application/json"].schema,
		).toBeDefined();
		expect(signUpPost.responses["201"]).toBeDefined();
	});

	it("should serve OpenAPI YAML specification at /docs/yaml", async () => {
		const response = await request(app.getHttpServer()).get("/docs/yaml");

		expect(response.status).toBe(200);
		expect(response.text).toContain("openapi: 3.0.0");
		expect(response.text).toContain("title: NestJS Scaffold DDD");
	});
});
