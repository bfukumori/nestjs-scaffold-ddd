import { randomUUIDv7 } from "node:crypto";
import type { FastifyRequest } from "fastify";

export function resolveRequestId(req: FastifyRequest["raw"]): string {
	const rawHeader = req.headers["x-request-id"];
	const incomingId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

	if (typeof incomingId === "string" && incomingId.trim().length > 0) {
		return incomingId.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 64);
	}

	return randomUUIDv7();
}
