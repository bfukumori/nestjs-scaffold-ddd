import {
	BadRequestException,
	type StandardSchemaValidationPipeOptions,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStandardSchemaValidationPipe } from "./standard-schema-validation.pipe.js";

describe("createStandardSchemaValidationPipe", () => {
	it("should create a configured StandardSchemaValidationPipe instance", () => {
		const pipe = createStandardSchemaValidationPipe();

		expect(pipe).toBeDefined();
	});

	describe("exceptionFactory", () => {
		it("should format issues with simple string paths into details", () => {
			const pipe = createStandardSchemaValidationPipe();
			const options = (
				pipe as unknown as {
					options: StandardSchemaValidationPipeOptions;
				}
			).options;

			const issues = [
				{
					path: ["email"],
					message: "Invalid email address",
				},
				{
					path: ["address", "zipCode"],
					message: "Zip code must be 8 digits",
				},
			];

			const exception = options.exceptionFactory?.(
				issues as unknown as Parameters<
					NonNullable<StandardSchemaValidationPipeOptions["exceptionFactory"]>
				>[0],
			);

			expect(exception).toBeInstanceOf(BadRequestException);
			const response = (exception as BadRequestException).getResponse() as {
				error: string;
				message: string;
				details: Array<{ field: string; message: string }>;
			};

			expect(response).toEqual({
				error: "VALIDATION_ERROR",
				message: "Validation failed",
				details: [
					{ field: "email", message: "Invalid email address" },
					{ field: "address.zipCode", message: "Zip code must be 8 digits" },
				],
			});
		});

		it("should format issues with object segment paths into dot-separated keys", () => {
			const pipe = createStandardSchemaValidationPipe();
			const options = (
				pipe as unknown as {
					options: StandardSchemaValidationPipeOptions;
				}
			).options;

			const issues = [
				{
					path: [{ key: "users" }, { key: 0 }, { key: "profile" }],
					message: "Profile is required",
				},
			];

			const exception = options.exceptionFactory?.(
				issues as unknown as Parameters<
					NonNullable<StandardSchemaValidationPipeOptions["exceptionFactory"]>
				>[0],
			);

			const response = (exception as BadRequestException).getResponse() as {
				details: Array<{ field: string; message: string }>;
			};

			expect(response.details).toEqual([
				{ field: "users.0.profile", message: "Profile is required" },
			]);
		});

		it("should fallback field to 'body' when issue path is missing or empty", () => {
			const pipe = createStandardSchemaValidationPipe();
			const options = (
				pipe as unknown as {
					options: StandardSchemaValidationPipeOptions;
				}
			).options;

			const issues = [
				{
					path: undefined,
					message: "Expected object, received array",
				},
				{
					path: [],
					message: "Root validation failed",
				},
			];

			const exception = options.exceptionFactory?.(
				issues as unknown as Parameters<
					NonNullable<StandardSchemaValidationPipeOptions["exceptionFactory"]>
				>[0],
			);

			const response = (exception as BadRequestException).getResponse() as {
				details: Array<{ field: string; message: string }>;
			};

			expect(response.details).toEqual([
				{ field: "body", message: "Expected object, received array" },
				{ field: "body", message: "Root validation failed" },
			]);
		});
	});

	describe("end-to-end pipe transform", () => {
		const testSchema = z.object({
			email: z.email(),
			age: z.number().min(18),
		});

		it("should return validated and transformed data when input is valid", async () => {
			const pipe = createStandardSchemaValidationPipe();
			const validData = {
				email: "dev@tamagolabs.com.br",
				age: 25,
			};

			const result = await pipe.transform(validData, {
				type: "body",
				schema: testSchema,
			} as unknown as Parameters<typeof pipe.transform>[1]);

			expect(result).toEqual(validData);
		});

		it("should throw formatted BadRequestException when input is invalid", async () => {
			const pipe = createStandardSchemaValidationPipe();
			const invalidData = {
				email: "not-an-email",
				age: 15,
			};

			try {
				await pipe.transform(invalidData, {
					type: "body",
					schema: testSchema,
				} as unknown as Parameters<typeof pipe.transform>[1]);
				expect.unreachable("Pipe should have thrown BadRequestException");
			} catch (err) {
				expect(err).toBeInstanceOf(BadRequestException);
				const response = (err as BadRequestException).getResponse() as {
					error: string;
					message: string;
					details: Array<{ field: string; message: string }>;
				};

				expect(response.error).toBe("VALIDATION_ERROR");
				expect(response.message).toBe("Validation failed");
				expect(response.details.map((d) => d.field)).toEqual(["email", "age"]);
			}
		});

		it("should bypass validation when metadata does not have a schema", async () => {
			const pipe = createStandardSchemaValidationPipe();
			const data = { raw: "anything" };

			const result = await pipe.transform(data, {
				type: "body",
			} as unknown as Parameters<typeof pipe.transform>[1]);

			expect(result).toBe(data);
		});
	});
});
