import { signupSchema } from '../schemas/signup';

describe('signupSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    ageConfirmed: true,
  };

  it('accepts a valid submission', () => {
    const result = signupSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('email');
    }
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('password');
    }
  });

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      ...valid,
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.flatMap((i) => i.path);
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects when ageConfirmed is false', () => {
    const result = signupSchema.safeParse({ ...valid, ageConfirmed: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('ageConfirmed');
    }
  });
});
