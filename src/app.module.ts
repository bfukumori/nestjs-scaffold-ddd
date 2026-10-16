import { join } from "node:path";
import { AuthenticationModule } from "@nestjs/authentication";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import {
	FileTemplateEngine,
	LogMailTransport,
	MailModule,
	SmtpTransport,
} from "@nestjs/mail";
import { minutes, ThrottlerModule } from "@nestjs/throttler";
import { EnvModule } from "./infra/config/env/env.module.js";
import { EnvService } from "./infra/config/env/env.service.js";
import { LoggerModule } from "./infra/logging/logger.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { AuthThrottlerGuard } from "./modules/auth/infra/http/guards/auth-throttler.guard.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
	imports: [
		ThrottlerModule.forRoot([{ name: "default", ttl: minutes(1), limit: 100 }]),
		MailModule.forRootAsync({
			imports: [EnvModule],
			inject: [EnvService],
			useFactory: (envService: EnvService) => ({
				transport: envService.get("SMTP_URL")
					? new SmtpTransport({ url: envService.get("SMTP_URL") })
					: new LogMailTransport(),
				templates: new FileTemplateEngine({
					dir: join(import.meta.dirname, "infra/mail/templates"),
					cache: envService.isProduction,
				}),
				from: "Accounts <accounts@example.com>",
			}),
		}),
		AuthenticationModule.forRootAsync({
			imports: [EnvModule],
			inject: [EnvService],
			useFactory: (envService: EnvService) => ({
				session: {
					absoluteTtl: "14d",
					idleTtl: "3d",
					metadata: (request) => ({ userAgent: request.headers["user-agent"] }),
				},
				emailVerification: { url: `${envService.get("APP_URL")}/verify-email` },
				passwordReset: { url: `${envService.get("APP_URL")}/reset-password` },
				accessToken: {
					key: envService.get("JWT_SECRET"),
					issuer: "https://api.example.com",
					audience: "mobile-app",
					ttl: "15m",
				},
			}),
		}),
		AuthModule,
		EnvModule,
		LoggerModule,
		UsersModule,
	],
	providers: [{ provide: APP_GUARD, useClass: AuthThrottlerGuard }],
})
export class AppModule {}
