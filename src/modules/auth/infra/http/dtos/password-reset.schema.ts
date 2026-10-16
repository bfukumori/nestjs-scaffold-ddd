import { z } from "zod";

export { type EmailDto, emailSchema } from "./auth.schema.js";

export const passwordResetSchema = z.object({
	token: z.string(),
	password: z.string().min(12).max(128),
});
export type PasswordResetDto = z.infer<typeof passwordResetSchema>;

export const passwordResetResponseSchema = z.object({
	mfaRequired: z.boolean(),
});
export type PasswordResetResponseDto = z.infer<
	typeof passwordResetResponseSchema
>;
