import { pickLanguage, buildConfirmationUrl, buildAuthEmail } from '../templates';

describe('pickLanguage', () => {
  it('returns en when metadata language is en', () => {
    expect(pickLanguage({ language: 'en' })).toBe('en');
  });

  it('returns sv when metadata language is sv', () => {
    expect(pickLanguage({ language: 'sv' })).toBe('sv');
  });

  it('falls back to sv when language is missing', () => {
    expect(pickLanguage({})).toBe('sv');
    expect(pickLanguage(undefined)).toBe('sv');
  });

  it('falls back to sv for an unsupported language', () => {
    expect(pickLanguage({ language: 'de' })).toBe('sv');
  });
});

describe('buildConfirmationUrl', () => {
  it('builds the Supabase verify URL from email_data', () => {
    const url = buildConfirmationUrl({
      site_url: 'https://jxd.supabase.co',
      token_hash: 'abc123',
      email_action_type: 'signup',
      redirect_to: 'akin://welcome',
    });
    expect(url).toBe(
      'https://jxd.supabase.co/auth/v1/verify?token=abc123&type=signup&redirect_to=akin%3A%2F%2Fwelcome',
    );
  });

  it('url-encodes the redirect_to deep link', () => {
    const url = buildConfirmationUrl({
      site_url: 'https://jxd.supabase.co',
      token_hash: 'xyz',
      email_action_type: 'recovery',
      redirect_to: 'akin://reset-confirm',
    });
    expect(url).toContain('type=recovery');
    expect(url).toContain('redirect_to=akin%3A%2F%2Freset-confirm');
  });
});

describe('buildAuthEmail', () => {
  const baseArgs = {
    confirmationUrl: 'https://jxd.supabase.co/auth/v1/verify?token=t&type=signup',
    token: '123456',
  };

  describe('signup confirmation', () => {
    it('renders an English signup email with the confirmation link', () => {
      const email = buildAuthEmail({ ...baseArgs, actionType: 'signup', lang: 'en' });
      expect(email.subject).toMatch(/confirm/i);
      expect(email.html).toContain(baseArgs.confirmationUrl);
    });

    it('renders a Swedish signup email', () => {
      const email = buildAuthEmail({ ...baseArgs, actionType: 'signup', lang: 'sv' });
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.html).toContain(baseArgs.confirmationUrl);
      // Swedish subject should differ from English
      const en = buildAuthEmail({ ...baseArgs, actionType: 'signup', lang: 'en' });
      expect(email.subject).not.toBe(en.subject);
    });

    it('includes the OTP token as a fallback code', () => {
      const email = buildAuthEmail({ ...baseArgs, actionType: 'signup', lang: 'en' });
      expect(email.html).toContain('123456');
    });
  });

  describe('recovery (password reset)', () => {
    it('renders an English recovery email with the reset link', () => {
      const email = buildAuthEmail({ ...baseArgs, actionType: 'recovery', lang: 'en' });
      expect(email.subject).toMatch(/reset|password/i);
      expect(email.html).toContain(baseArgs.confirmationUrl);
    });

    it('renders a Swedish recovery email', () => {
      const email = buildAuthEmail({ ...baseArgs, actionType: 'recovery', lang: 'sv' });
      expect(email.html).toContain(baseArgs.confirmationUrl);
    });
  });

  describe('email_change', () => {
    it('renders an email-change confirmation in both languages', () => {
      const en = buildAuthEmail({ ...baseArgs, actionType: 'email_change', lang: 'en' });
      const sv = buildAuthEmail({ ...baseArgs, actionType: 'email_change', lang: 'sv' });
      expect(en.html).toContain(baseArgs.confirmationUrl);
      expect(sv.html).toContain(baseArgs.confirmationUrl);
      expect(en.subject).not.toBe(sv.subject);
    });
  });

  it('uses the ourakin.com support address in the footer', () => {
    const email = buildAuthEmail({ ...baseArgs, actionType: 'signup', lang: 'en' });
    expect(email.html).toContain('info@ourakin.com');
  });

  it('falls back to a sensible default for an unknown action type', () => {
    const email = buildAuthEmail({
      ...baseArgs,
      // @ts-expect-error — testing runtime fallback for an unexpected action type
      actionType: 'magiclink',
      lang: 'en',
    });
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.html).toContain(baseArgs.confirmationUrl);
  });
});
