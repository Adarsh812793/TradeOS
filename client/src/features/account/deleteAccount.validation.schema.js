
import { z } from "zod";

// The password is checked by the server; here we only make sure it is filled in and the warning was acknowledged
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
  understood: z
    .boolean()
    .refine((value) => value === true, "Please confirm that you understand"),
});

export default deleteAccountSchema;
