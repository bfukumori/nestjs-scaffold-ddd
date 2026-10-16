import { z } from "zod";

export const confirmMfaSchema = z.object({
	code: z.string().trim().length(6, "The TOTP code must contain 6 digits"),
});
export type ConfirmMfaDto = z.infer<typeof confirmMfaSchema>;

export const verifyMfaSchema = z
	.object({
		code: z.string().trim().length(6).optional(),
		recoveryCode: z.string().trim().min(6).optional(),
	})
	.refine((data) => Boolean(data.code || data.recoveryCode), {
		message: "Provide the TOTP code or a recovery code",
	});
export type VerifyMfaDto = z.infer<typeof verifyMfaSchema>;

export const mfaEnrollResponseSchema = z.object({
	secret: z.string(),
	uri: z.string(),
});
export type MfaEnrollResponseDto = z.infer<typeof mfaEnrollResponseSchema>;

export const mfaConfirmResponseSchema = z.object({
	recoveryCodes: z.array(z.string()),
});
export type MfaConfirmResponseDto = z.infer<typeof mfaConfirmResponseSchema>;

export const mfaVerifyResponseSchema = z.object({
	mfa: z.string(),
});
export type MfaVerifyResponseDto = z.infer<typeof mfaVerifyResponseSchema>;
