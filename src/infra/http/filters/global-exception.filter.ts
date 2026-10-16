import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import {
	DomainError,
	DomainErrorKind,
} from "@src/core/domain/errors/domain.error.js";
import { EnvService } from "@src/infra/config/env/env.service.js";
import type { FastifyReply, FastifyRequest } from "fastify";

const DOMAIN_KIND_HTTP_STATUS_MAP: Readonly<Record<DomainErrorKind, number>> = {
	VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
	ENTITY_NOT_FOUND: HttpStatus.NOT_FOUND,
	CONFLICT: HttpStatus.CONFLICT,
	FORBIDDEN: HttpStatus.FORBIDDEN,
	UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
	BUSINESS_RULE_VIOLATION: HttpStatus.UNPROCESSABLE_ENTITY,
};

interface ExtractedHttpDetails {
	readonly message: string;
	readonly error?: string;
	readonly details?: unknown;
}

export interface ErrorResponsePayload {
	statusCode: number;
	error: string;
	message: string;
	path: string;
	requestId: string;
	timestamp: string;
	details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	constructor(private readonly envService: EnvService) {}

	public catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const reply = ctx.getResponse<FastifyReply>();
		const request = ctx.getRequest<FastifyRequest>();

		const path = request.url;
		const method = request.method;
		const timestamp = new Date().toISOString();
		const requestId = request.id;

		if (exception instanceof DomainError) {
			this.handleDomainError(exception, reply, {
				path,
				method,
				requestId,
				timestamp,
			});
			return;
		}

		if (exception instanceof HttpException) {
			this.handleHttpException(exception, reply, {
				path,
				method,
				requestId,
				timestamp,
			});
			return;
		}

		this.handleUnhandledError(exception, reply, {
			path,
			method,
			requestId,
			timestamp,
		});
	}

	private handleDomainError(
		exception: DomainError,
		reply: FastifyReply,
		meta: {
			path: string;
			method: string;
			requestId: string;
			timestamp: string;
		},
	): void {
		const statusCode =
			DOMAIN_KIND_HTTP_STATUS_MAP[exception.kind] ??
			HttpStatus.INTERNAL_SERVER_ERROR;

		this.logger.warn({
			event: "domain_error_handled",
			kind: exception.kind,
			name: exception.name,
			message: exception.message,
			...meta,
		});

		const payload: ErrorResponsePayload = {
			statusCode,
			error: exception.kind,
			message: exception.message,
			...meta,
		};

		void reply.status(statusCode).send(payload);
	}

	private handleHttpException(
		exception: HttpException,
		reply: FastifyReply,
		meta: {
			path: string;
			method: string;
			requestId: string;
			timestamp: string;
		},
	): void {
		const statusCode = exception.getStatus();
		const rawResponse = exception.getResponse();
		const { message, error, details } =
			this.extractHttpExceptionDetails(rawResponse);

		this.logger.warn({
			event: "http_exception_handled",
			statusCode,
			name: exception.name,
			message,
			details,
			...meta,
		});

		const payload: ErrorResponsePayload = {
			statusCode,
			error: error ?? exception.name.replace("Exception", "").toUpperCase(),
			message,
			path: meta.path,
			requestId: meta.requestId,
			timestamp: meta.timestamp,
			...(details !== undefined ? { details } : {}),
		};

		void reply.status(statusCode).send(payload);
	}

	private handleUnhandledError(
		exception: unknown,
		reply: FastifyReply,
		meta: {
			path: string;
			method: string;
			requestId: string;
			timestamp: string;
		},
	): void {
		const errorInstance =
			exception instanceof Error ? exception : new Error(String(exception));

		this.logger.error({
			event: "unhandled_exception",
			name: errorInstance.name,
			message: errorInstance.message,
			stack: errorInstance.stack,
			...meta,
		});

		const isDevelopment = this.envService.isDevelopment;

		const payload: ErrorResponsePayload = {
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			error: "INTERNAL_SERVER_ERROR",
			message: isDevelopment
				? errorInstance.message
				: "An unexpected internal server error occurred.",
			path: meta.path,
			requestId: meta.requestId,
			timestamp: meta.timestamp,
			...(isDevelopment && errorInstance.stack
				? { details: errorInstance.stack.split("\n") }
				: {}),
		};

		void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(payload);
	}

	private extractHttpExceptionDetails(
		rawResponse: unknown,
	): ExtractedHttpDetails {
		if (typeof rawResponse === "string") {
			return { message: rawResponse };
		}

		if (typeof rawResponse !== "object" || rawResponse === null) {
			return { message: "Http Exception" };
		}

		const record = rawResponse as Record<string, unknown>;
		const error = typeof record.error === "string" ? record.error : undefined;

		if (record.details !== undefined) {
			return {
				message:
					typeof record.message === "string"
						? record.message
						: "Validation failed",
				error,
				details: record.details,
			};
		}

		if (Array.isArray(record.message)) {
			return {
				message: "Validation failed",
				error,
				details: record.message,
			};
		}

		return {
			message:
				typeof record.message === "string" ? record.message : "Http Exception",
			error,
		};
	}
}
