import { z } from "zod";

export const envSchema = z.object({
	PORT: z.coerce.number().default(3001),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	SMTP_URL: z.url().optional(),
	APP_URL: z.url().default("http://localhost:3000"),
	JWT_SECRET: z.string("JWT_SECRET is required"),
	TOTP_ENCRYPTION_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
