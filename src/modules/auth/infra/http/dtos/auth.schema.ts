import { z } from "zod";

export const signInSchema = z.object({
	email: z.email(),
	password: z.string(),
});
export type SignInDto = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
	email: z.email(),
	password: z.string().min(12).max(128),
});
export type SignUpDto = z.infer<typeof signUpSchema>;

export const emailSchema = z.object({
	email: z.email(),
});
export type EmailDto = z.infer<typeof emailSchema>;

export const signInResponseSchema = z.object({
	mfaRequired: z.boolean(),
});
export type SignInResponseDto = z.infer<typeof signInResponseSchema>;
