import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { AppModule } from "./app.module.js";
import type { EnvService } from "./infra/config/env/env.service.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";

describe("AppModule", () => {
	it("should compile and instantiate UsersModule", async () => {
		const module = new UsersModule();
		expect(module).toBeDefined();

		const moduleRef = await Test.createTestingModule({
			imports: [UsersModule],
		}).compile();

		expect(moduleRef).toBeDefined();
		await moduleRef.close();
	});

	it("should compile and instantiate AuthModule with mocked dependencies", async () => {
		const module = new AuthModule();
		expect(module).toBeDefined();

		const moduleRef = await Test.createTestingModule({
			imports: [AuthModule],
		})
			.useMocker((_token) => {
				return {
					registerHandler: vi.fn(),
					registerProvider: vi.fn(),
				};
			})
			.compile();

		expect(moduleRef).toBeDefined();
		await moduleRef.close();
	});

	describe("Module factories", () => {
		interface ProviderWithFactory {
			useFactory?: (
				env: EnvService,
			) => Promise<Record<string, unknown>> | Record<string, unknown>;
		}
		interface DynamicModuleWithProviders {
			module?: { name: string };
			providers?: Array<ProviderWithFactory>;
		}

		const imports = Reflect.getMetadata(
			"imports",
			AppModule,
		) as Array<DynamicModuleWithProviders>;

		describe("MailModule factory", () => {
			const mailDynamicModule = imports.find(
				(imp) => imp && imp.module?.name === "MailModule",
			);
			const mailFactoryProvider = mailDynamicModule?.providers?.find(
				(p) => p && typeof p === "object" && typeof p.useFactory === "function",
			);

			it("should configure SmtpTransport when SMTP_URL is present", async () => {
				const mockEnvService = {
					get: vi.fn((key: string) => {
						if (key === "SMTP_URL") return "smtp://smtp.example.com";
						return undefined;
					}),
					isProduction: true,
				} as unknown as EnvService;

				const config = (await mailFactoryProvider?.useFactory?.(
					mockEnvService,
				)) as {
					from: string;
					transport: { constructor: { name: string } };
				};

				expect(config.from).toBe("Accounts <accounts@example.com>");
				expect(config.transport.constructor.name).toBe("SmtpTransport");
			});

			it("should fallback to LogMailTransport when SMTP_URL is not present", async () => {
				const mockEnvService = {
					get: vi.fn(() => undefined),
					isProduction: false,
				} as unknown as EnvService;

				const config = (await mailFactoryProvider?.useFactory?.(
					mockEnvService,
				)) as {
					transport: { constructor: { name: string } };
				};

				expect(config.transport.constructor.name).toBe("LogMailTransport");
			});
		});

		describe("AuthenticationModule factory", () => {
			const authDynamicModule = imports.find(
				(imp) => imp && imp.module?.name === "AuthenticationModule",
			);
			const authFactoryProvider = authDynamicModule?.providers?.find(
				(p) => p && typeof p === "object" && typeof p.useFactory === "function",
			);

			it("should configure authentication options and session metadata extractor", async () => {
				const mockEnvService = {
					get: vi.fn((key: string) => {
						if (key === "APP_URL") return "https://myapp.com";
						if (key === "JWT_SECRET") return "super-secret";
						return undefined;
					}),
				} as unknown as EnvService;

				const config = (await authFactoryProvider?.useFactory?.(
					mockEnvService,
				)) as {
					emailVerification: { url: string };
					passwordReset: { url: string };
					accessToken: { key: string };
					session: {
						metadata: (req: { headers: Record<string, string> }) => {
							userAgent: string;
						};
					};
				};

				expect(config.emailVerification.url).toBe(
					"https://myapp.com/verify-email",
				);
				expect(config.passwordReset.url).toBe(
					"https://myapp.com/reset-password",
				);
				expect(config.accessToken.key).toBe("super-secret");

				const metadata = config.session.metadata({
					headers: { "user-agent": "CustomAgent/1.0" },
				});
				expect(metadata).toEqual({ userAgent: "CustomAgent/1.0" });
			});
		});
	});
});
