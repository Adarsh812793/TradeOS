import { z } from "zod";

// Step 1 of forgot password: just the email the code goes to
export const forgotEmailSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

// Step 2: the 6-digit code from the email and the new password (typed twice)
export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .min(1, "Enter the 6-digit code from your email")
      .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),

    newPassword: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
