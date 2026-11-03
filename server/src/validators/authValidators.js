const { z } = require("zod");

// Lowercasing means "Name@Gmail.com" and "name@gmail.com" are the same account.
// Accounts created earlier with capital letters in the email will need the lowercase form.
const emailField = z.string().trim().toLowerCase().email();

const signupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

module.exports = { signupSchema, loginSchema };