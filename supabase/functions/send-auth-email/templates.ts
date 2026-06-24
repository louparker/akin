/**
 * Pure, dependency-free template logic for the send-auth-email Auth Hook.
 *
 * Kept free of Deno/remote imports so it can be unit-tested with Jest while
 * the index.ts entry point (signature verification, Resend send) stays thin.
 *
 * Auth emails are server-rendered here and therefore do NOT pass through
 * src/i18n. The Swedish copy below is marked for native review.
 */

export type Lang = 'sv' | 'en';
export type AuthActionType = 'signup' | 'recovery' | 'email_change';

const SUPPORTED_LANGS: ReadonlySet<string> = new Set(['sv', 'en']);
const SUPPORT_ADDRESS = 'info@ourakin.com';

export interface EmailData {
  site_url: string;
  token_hash: string;
  email_action_type: string;
  redirect_to: string;
}

export interface AuthEmail {
  subject: string;
  html: string;
}

export interface BuildAuthEmailArgs {
  actionType: AuthActionType;
  lang: Lang;
  confirmationUrl: string;
  token: string;
}

/** Pick a supported language from Supabase user metadata, defaulting to Swedish. */
export function pickLanguage(metadata: { language?: string } | undefined | null): Lang {
  const lang = metadata?.language;
  if (lang && SUPPORTED_LANGS.has(lang)) return lang as Lang;
  return 'sv';
}

// Email clients refuse to render custom-scheme (akin://) links as tappable, which
// is why the old `akin://confirm` signup CTA was a dead button. The fix is an
// https redirect page on the marketing site that immediately forwards to
// akin://confirm?token_hash=...&type=signup. The browser→app-scheme handoff
// (unlike email→app-scheme) works reliably, and the token_hash is preserved so
// the in-app verifyOtp({ token_hash }) flow is completely unchanged.
//
// FOUNDER ACTION (deploy once): host a static page at APP_CONFIRM_REDIRECT that runs
//   const p = new URLSearchParams(location.search);
//   location.replace('akin://confirm?' + p.toString());
// See docs/auth-confirm-redirect.html for the ready-to-deploy file.
const APP_CONFIRM_REDIRECT = 'https://ourakin.com/auth/confirm';

/**
 * Build the URL the email's CTA points to.
 *
 * Signup forwards the single-use token_hash through the https redirect page
 * above (clickable in email, then opens the app). Recovery and email-change keep
 * the Supabase verify URL — already https, already clickable — unchanged.
 */
export function buildConfirmationUrl(data: EmailData): string {
  if (data.email_action_type === 'signup') {
    const params = new URLSearchParams({
      token_hash: data.token_hash,
      type: data.email_action_type,
    });
    return `${APP_CONFIRM_REDIRECT}?${params.toString()}`;
  }

  const base = data.site_url.replace(/\/$/, '');
  const params = new URLSearchParams({
    token: data.token_hash,
    type: data.email_action_type,
    redirect_to: data.redirect_to,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

interface Copy {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  codeIntro: string;
  ignore: string;
  support: string;
}

function copyFor(actionType: AuthActionType, lang: Lang): Copy {
  // TODO i18n review: Swedish auth-email copy, needs native review + legal sign-off before launch
  const table: Record<AuthActionType, Record<Lang, Copy>> = {
    signup: {
      en: {
        subject: 'Confirm your email for Akin',
        heading: 'Welcome to Akin',
        intro: 'Confirm your email address to start using Akin.',
        cta: 'Confirm email',
        codeIntro: 'Or enter this code in the app:',
        ignore: "If you didn't create an Akin account, you can ignore this email.",
        support: `Questions? Contact us at ${SUPPORT_ADDRESS}.`,
      },
      sv: {
        subject: 'Bekräfta din e-post för Akin',
        heading: 'Välkommen till Akin',
        intro: 'Bekräfta din e-postadress för att börja använda Akin.',
        cta: 'Bekräfta e-post',
        codeIntro: 'Eller ange den här koden i appen:',
        ignore: 'Om du inte skapade ett Akin-konto kan du ignorera det här mejlet.',
        support: `Frågor? Kontakta oss på ${SUPPORT_ADDRESS}.`,
      },
    },
    recovery: {
      en: {
        subject: 'Reset your Akin password',
        heading: 'Reset your password',
        intro: 'Tap the button below to choose a new password.',
        cta: 'Reset password',
        codeIntro: 'Or enter this code in the app:',
        ignore: "If you didn't request a password reset, you can ignore this email.",
        support: `Questions? Contact us at ${SUPPORT_ADDRESS}.`,
      },
      sv: {
        subject: 'Återställ ditt Akin-lösenord',
        heading: 'Återställ ditt lösenord',
        intro: 'Tryck på knappen nedan för att välja ett nytt lösenord.',
        cta: 'Återställ lösenord',
        codeIntro: 'Eller ange den här koden i appen:',
        ignore: 'Om du inte begärde en lösenordsåterställning kan du ignorera det här mejlet.',
        support: `Frågor? Kontakta oss på ${SUPPORT_ADDRESS}.`,
      },
    },
    email_change: {
      en: {
        subject: 'Confirm your new email for Akin',
        heading: 'Confirm your new email',
        intro: 'Confirm this address to finish changing your Akin email.',
        cta: 'Confirm new email',
        codeIntro: 'Or enter this code in the app:',
        ignore: "If you didn't request this change, contact us immediately.",
        support: `Questions? Contact us at ${SUPPORT_ADDRESS}.`,
      },
      sv: {
        subject: 'Bekräfta din nya e-post för Akin',
        heading: 'Bekräfta din nya e-post',
        intro: 'Bekräfta den här adressen för att slutföra bytet av din Akin-e-post.',
        cta: 'Bekräfta ny e-post',
        codeIntro: 'Eller ange den här koden i appen:',
        ignore: 'Om du inte begärde det här bytet, kontakta oss omedelbart.',
        support: `Frågor? Kontakta oss på ${SUPPORT_ADDRESS}.`,
      },
    },
  };

  return table[actionType][lang];
}

/** Render a bilingual, branded auth email for the given action type. */
export function buildAuthEmail(args: BuildAuthEmailArgs): AuthEmail {
  const { lang, confirmationUrl, token } = args;
  // Runtime fallback: any unexpected action type renders as a signup confirmation.
  const actionType: AuthActionType = (['signup', 'recovery', 'email_change'] as const).includes(
    args.actionType,
  )
    ? args.actionType
    : 'signup';

  const c = copyFor(actionType, lang);

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #231f21;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${c.heading}</h1>
      <p style="font-size: 16px; line-height: 1.5;">${c.intro}</p>
      <p style="margin: 28px 0;">
        <a href="${confirmationUrl}"
           style="background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
          ${c.cta}
        </a>
      </p>
      <p style="font-size: 14px; color: #6b6b6b;">${c.codeIntro}</p>
      <p style="font-size: 22px; letter-spacing: 4px; font-weight: 600;">${token}</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;">
      <p style="font-size: 13px; color: #8a8a8a;">${c.ignore}</p>
      <p style="font-size: 13px; color: #8a8a8a;">${c.support}</p>
    </div>
  `.trim();

  return { subject: c.subject, html };
}
