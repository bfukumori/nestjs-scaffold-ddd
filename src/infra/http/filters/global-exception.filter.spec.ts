import type { ArgumentsHost } from "@nestjs/common";
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	NotFoundException,
} from "@nestjs/common";
import {
	DomainError,
	type DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";
import type { EnvService } from "@src/infra/config/env/env.service.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ErrorResponsePayload,
	GlobalExceptionFilter,
} from "./global-exception.filter.js";

class DummyDomainError extends DomainError {
	readonly kind: DomainErrorKind;

	constructor(kind: DomainErrorKind, message: string) {
		super(message);
		this.kind = kind;
	}
}

describe("GlobalExceptionFilter", () => {
	let filter: GlobalExceptionFilter;
	let envService: { isDevelopment: boolean };
	let reply: {
		status: ReturnType<typeof vi.fn>;
		send: ReturnType<typeof vi.fn>;
	};
	let request: {
		url: string;
		method: string;
		id: string;
	};
	let host: ArgumentsHost;

	beforeEach(() => {
		envService = { isDevelopment: false };
		filter = new GlobalExceptionFilter(envService as unknown as EnvService);

		reply = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		};

		request = {
			url: "/v1/users/register",
			method: "POST",
			id: "test-req-id-123",
		};

		host = {
			switchToHttp: () => ({
				getResponse: () => reply as unknown as FastifyReply,
				getRequest: () => request as unknown as FastifyRequest,
			}),
		} as unknown as ArgumentsHost;
	});

	describe("DomainError handling", () => {
		const testCases: Array<{
			kind: DomainErrorKind;
			expectedStatus: number;
		}> = [
			{ kind: "VALIDATION_ERROR", expectedStatus: HttpStatus.BAD_REQUEST },
			{ kind: "ENTITY_NOT_FOUND", expectedStatus: HttpStatus.NOT_FOUND },
			{ kind: "CONFLICT", expectedStatus: HttpStatus.CONFLICT },
			{ kind: "FORBIDDEN", expectedStatus: HttpStatus.FORBIDDEN },
			{ kind: "UNAUTHORIZED", expectedStatus: HttpStatus.UNAUTHORIZED },
			{
				kind: "BUSINESS_RULE_VIOLATION",
				expectedStatus: HttpStatus.UNPROCESSABLE_ENTITY,
			},
		];

		for (const { kind, expectedStatus } of testCases) {
			it(`should map domain error kind "${kind}" to status ${expectedStatus}`, () => {
				const error = new DummyDomainError(kind, `Error message for ${kind}`);

				filter.catch(error, host);

				expect(reply.status).toHaveBeenCalledWith(expectedStatus);
				expect(reply.send).toHaveBeenCalledWith(
					expect.objectContaining<Partial<ErrorResponsePayload>>({
						statusCode: expectedStatus,
						error: kind,
						message: `Error message for ${kind}`,
						path: "/v1/users/register",
						requestId: "test-req-id-123",
					}),
				);
			});
		}

		it("should fallback to 500 when domain error kind is unmapped", () => {
			const error = new DummyDomainError(
				"UNKNOWN_KIND" as DomainErrorKind,
				"Unknown domain issue",
			);

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					error: "UNKNOWN_KIND",
					message: "Unknown domain issue",
				}),
			);
		});
	});

	describe("HttpException handling", () => {
		it("should handle built-in HttpException (e.g. NotFoundException)", () => {
			const error = new NotFoundException("User profile not found");

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.NOT_FOUND,
					error: "Not Found",
					message: "User profile not found",
					path: "/v1/users/register",
					requestId: "test-req-id-123",
				}),
			);
		});

		it("should handle custom HttpException with plain string response", () => {
			const error = new HttpException(
				"Simple error string",
				HttpStatus.FORBIDDEN,
			);

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.FORBIDDEN,
					error: "HTTP",
					message: "Simple error string",
					path: "/v1/users/register",
					requestId: "test-req-id-123",
				}),
			);
		});

		it("should handle HttpException with structured object response and custom error", () => {
			const error = new HttpException(
				{
					error: "RATE_LIMIT_EXCEEDED",
					message: "Too many requests",
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					error: "RATE_LIMIT_EXCEEDED",
					message: "Too many requests",
				}),
			);
		});

		it("should handle HttpException with details payload (e.g. validation pipes)", () => {
			const error = new BadRequestException({
				error: "VALIDATION_ERROR",
				message: "Validation failed",
				details: [{ field: "email", message: "Invalid email" }],
			});

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.BAD_REQUEST,
					error: "VALIDATION_ERROR",
					message: "Validation failed",
					details: [{ field: "email", message: "Invalid email" }],
				}),
			);
		});

		it("should convert class-validator array message format into details", () => {
			const error = new BadRequestException({
				message: ["email must be an email", "password is too short"],
			});

			filter.catch(error, host);

			expect(reply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					statusCode: HttpStatus.BAD_REQUEST,
					message: "Validation failed",
					details: ["email must be an email", "password is too short"],
				}),
			);
		});

		it("should use fallback 'Validation failed' when details is present but message is not a string", () => {
			const error = new HttpException(
				{
					details: [{ reason: "invalid" }],
				},
				HttpStatus.BAD_REQUEST,
			);

			filter.catch(error, host);

			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					message: "Validation failed",
					details: [{ reason: "invalid" }],
				}),
			);
		});

		it("should use fallback 'Http Exception' when response object has no string message", () => {
			const error = new HttpException({}, HttpStatus.BAD_REQUEST);

			filter.catch(error, host);

			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					message: "Http Exception",
				}),
			);
		});

		it("should provide fallback message when rawResponse is null or invalid object", () => {
			const error = new HttpException(
				null as unknown as string,
				HttpStatus.INTERNAL_SERVER_ERROR,
			);

			filter.catch(error, host);

			expect(reply.send).toHaveBeenCalledWith(
				expect.objectContaining<Partial<ErrorResponsePayload>>({
					message: "Http Exception",
				}),
			);
		});
	});

	describe("Unhandled Error handling (Security & Info Leak Protection)", () => {
		it("should sanitize error message and NEVER expose stack trace in production (non-development)", () => {
			envService.isDevelopment = false;
			const sensitiveError = new Error(
				"Connection pool exhausted: postgres://postgres:supersecret@db:5432/main",
			);

			filter.catch(sensitiveError, host);

			expect(reply.status).toHaveBeenCalledWith(
				HttpStatus.INTERNAL_SERVER_ERROR,
			);

			const payload = reply.send.mock.calls[0][0] as ErrorResponsePayload;
			expect(payload.statusCode).toBe(500);
			expect(payload.error).toBe("INTERNAL_SERVER_ERROR");
			expect(payload.message).toBe(
				"An unexpected internal server error occurred.",
			);
			expect(payload.details).toBeUndefined();
			expect(JSON.stringify(payload)).not.toContain("supersecret");
		});

		it("should expose error message and stack trace in development for debugging", () => {
			envService.isDevelopment = true;
			const devError = new Error("Database query failed syntax error");

			filter.catch(devError, host);

			expect(reply.status).toHaveBeenCalledWith(
				HttpStatus.INTERNAL_SERVER_ERROR,
			);

			const payload = reply.send.mock.calls[0][0] as ErrorResponsePayload;
			expect(payload.message).toBe("Database query failed syntax error");
			expect(payload.details).toBeInstanceOf(Array);
		});

		it("should handle non-Error primitives safely", () => {
			envService.isDevelopment = false;
			const primitiveError = "raw string failure";

			filter.catch(primitiveError, host);

			expect(reply.status).toHaveBeenCalledWith(
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
			const payload = reply.send.mock.calls[0][0] as ErrorResponsePayload;
			expect(payload.message).toBe(
				"An unexpected internal server error occurred.",
			);
		});
	});
});
