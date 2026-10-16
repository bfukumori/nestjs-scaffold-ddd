import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerRequest } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";

interface AuthRequestBody {
	readonly email?: unknown;
}

const MAX_EMAIL_LENGTH = 254;
const IP_BURST_MULTIPLIER = 4;
const DEFAULT_THROTTLER_NAME = "default";

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
	protected override async handleRequest(
		requestProps: ThrottlerRequest,
	): Promise<boolean> {
		const { context, limit, ttl, throttler, blockDuration, generateKey } =
			requestProps;

		const { req } = this.getRequestResponse(context);
		const ip = await super.getTracker(req);
		const normalizedEmail = this.extractNormalizedEmail(req);

		if (normalizedEmail) {
			const throttlerName = throttler.name ?? DEFAULT_THROTTLER_NAME;
			const ipBurstLimit = limit * IP_BURST_MULTIPLIER;
			const ipKey = generateKey(context, `ip-burst:${ip}`, throttlerName);

			const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
				await this.storageService.increment(
					ipKey,
					ttl,
					ipBurstLimit,
					blockDuration,
					throttlerName,
				);

			if (isBlocked || totalHits > ipBurstLimit) {
				await this.throwThrottlingException(context, {
					limit: ipBurstLimit,
					ttl,
					key: ipKey,
					tracker: ip,
					totalHits,
					timeToExpire,
					isBlocked,
					timeToBlockExpire,
				});
			}
		}

		return super.handleRequest(requestProps);
	}

	protected override async getTracker(
		req: Record<string, unknown>,
	): Promise<string> {
		const ip = await super.getTracker(req);
		const normalizedEmail = this.extractNormalizedEmail(req);

		if (!normalizedEmail) {
			return ip;
		}

		return `${normalizedEmail}|${ip}`;
	}

	private extractNormalizedEmail(req: Record<string, unknown>): string | null {
		const fastifyRequest = req as unknown as FastifyRequest<{
			Body?: AuthRequestBody;
		}>;

		const emailRaw = fastifyRequest.body?.email;

		if (typeof emailRaw !== "string") {
			return null;
		}

		const trimmed = emailRaw.trim();

		if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) {
			return null;
		}

		return trimmed.normalize("NFC").toLowerCase();
	}
}
