import { z } from 'zod';

/**
 * Mirrors the backend's bean-validation constraints so the user gets immediate
 * feedback. The backend remains the source of truth — these rules are copied
 * from RegisterDto / LoginDto, not invented, and we never try to reproduce
 * business rules that only the server can evaluate.
 */

/** RegisterDto / LoginDto: @Size(min=8,max=100) + @Pattern(...). */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/;

export const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  {
    label: 'One special character (@$!%*?&)',
    test: (value: string) => /[@$!%*?&]/.test(value),
  },
] as const;

/**
 * LoginDto also carries the password pattern, but we only enforce length here:
 * telling someone their password composition rules on the sign-in form is poor
 * practice, and the backend still rejects anything malformed with a 400 whose
 * message we surface.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be at most 100 characters')
      .regex(
        PASSWORD_PATTERN,
        'Include a lowercase and uppercase letter, a number and a special character (@$!%*?&)'
      ),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
