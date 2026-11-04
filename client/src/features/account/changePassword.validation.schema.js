
import { z } from "zod";

// Same rules as the server (auth module): new password 8-128 characters and different from the current one.
// "Confirm" only exists in the form; it is never sent.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),

    newPassword: z
      .string()
      .min(1, "Enter a new password")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters"),

    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export default changePasswordSchema;
