import { Module } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { EnvModule } from "../config/env/env.module.js";
import { EnvService } from "../config/env/env.service.js";

@Module({
	imports: [
		PinoLoggerModule.forRootAsync({
			imports: [EnvModule],
			inject: [EnvService],
			useFactory: (envService: EnvService) => {
				const isDevelopment = envService.isDevelopment;

				return {
					pinoHttp: {
						genReqId: (req: FastifyRequest["raw"]) => {
							const rawHeader = req.headers["x-request-id"];
							const incomingId = Array.isArray(rawHeader)
								? rawHeader[0]
								: rawHeader;
							return incomingId || "unknown-req-id";
						},
						redact: {
							paths: [
								"req.headers.authorization",
								"req.headers.cookie",
								"req.body.password",
								"req.body.newPassword",
								"req.body.token",
							],
							censor: "[CONFIDENTIAL]",
						},
						level: isDevelopment ? "debug" : "info",
						transport: isDevelopment
							? {
									target: "pino-pretty",
									options: {
										colorize: true,
										singleLine: true,
										translateTime: "HH:MM:ss.l",
										ignore: "pid,hostname",
									},
								}
							: undefined,
						customAttributeKeys: {
							reqId: "requestId",
						},
					},
				};
			},
		}),
	],
	exports: [PinoLoggerModule],
})
export class LoggerModule {}
