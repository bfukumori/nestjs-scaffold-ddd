import type { INestApplication } from "@nestjs/common";
import { type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { describe, expect, it, vi } from "vitest";
import { createSwaggerDocument, setupSwagger } from "./swagger.config.js";

describe("Swagger Config", () => {
	const mockApp = {} as unknown as INestApplication;

	describe("createSwaggerDocument", () => {
		it("should build an OpenAPI document with expected metadata and tags", () => {
			const fakeDocument = {
				openapi: "3.0.0",
				info: { title: "NestJS Scaffold DDD", version: "1.0" },
				paths: {},
				tags: [{ name: "Auth" }],
			} as unknown as OpenAPIObject;
			const spy = vi
				.spyOn(SwaggerModule, "createDocument")
				.mockReturnValue(fakeDocument);

			const doc = createSwaggerDocument(mockApp);

			expect(spy).toHaveBeenCalled();
			expect(doc).toEqual(fakeDocument);
			spy.mockRestore();
		});
	});

	describe("setupSwagger", () => {
		it("should configure SwaggerModule with docs path and custom options", () => {
			const fakeDocument = {
				openapi: "3.0.0",
				info: { title: "NestJS Scaffold DDD", version: "1.0" },
				paths: {},
			} as unknown as OpenAPIObject;
			const createDocSpy = vi
				.spyOn(SwaggerModule, "createDocument")
				.mockReturnValue(fakeDocument);
			const setupSpy = vi
				.spyOn(SwaggerModule, "setup")
				.mockReturnValue(undefined);

			setupSwagger(mockApp);

			expect(createDocSpy).toHaveBeenCalled();
			expect(setupSpy).toHaveBeenCalledWith(
				"docs",
				mockApp,
				fakeDocument,
				expect.objectContaining({
					customSiteTitle: "NestJS Scaffold DDD - Swagger UI",
					jsonDocumentUrl: "docs/json",
					yamlDocumentUrl: "docs/yaml",
					swaggerOptions: expect.objectContaining({
						persistAuthorization: true,
						defaultModelsExpandDepth: 2,
					}),
				}),
			);

			createDocSpy.mockRestore();
			setupSpy.mockRestore();
		});
	});
});
