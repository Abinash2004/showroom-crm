import { z } from "zod";
import { phoneSchema, requiredText } from "./common";

export const employeeCodeSchema = z
  .string({ error: "Employee code is required" })
  .trim()
  .min(2, "Employee code is required")
  .max(20, "Employee code is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only")
  .transform((s) => s.toUpperCase());

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(128),
});

export const signupSchema = z
  .object({
    phone: phoneSchema,
    code: employeeCodeSchema,
    password: passwordSchema,
    confirmPassword: requiredText("Confirm password", 128),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type LoginInput = z.output<typeof loginSchema>;
export type SignupInput = z.output<typeof signupSchema>;
