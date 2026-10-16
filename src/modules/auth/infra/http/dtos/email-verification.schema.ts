import { z } from "zod";

export { type EmailDto, emailSchema } from "./auth.schema.js";

export const verifyEmailSchema = z.object({
	token: z.string("Token is required").trim().min(1, "Token cannot be empty"),
});
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

export const verifyEmailResponseSchema = z.object({
	email: z.email(),
	emailVerified: z.literal(true),
});
export type VerifyEmailResponseDto = z.infer<typeof verifyEmailResponseSchema>;
