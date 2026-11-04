
import { z } from "zod";

// Same rules as the server (users module): 2-50 characters, spaces around the name are ignored
const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
});

export default profileSchema;
