import Constants from 'expo-constants';

interface LegalConfig {
  privacyUrl: string;
  termsUrl: string;
  guidelinesUrl: string;
  dataRequestsUrl: string;
}

interface SupportConfig {
  feedbackEmail: string;
}

interface AppExtra {
  legal: Partial<LegalConfig>;
  support: Partial<SupportConfig>;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

const defaultLegalConfig: LegalConfig = {
  privacyUrl: 'https://ourakin.com/privacy',
  termsUrl: 'https://ourakin.com/terms',
  guidelinesUrl: 'https://ourakin.com/community-guidelines',
  dataRequestsUrl: 'https://ourakin.com/privacy/requests',
};

const defaultSupportConfig: SupportConfig = {
  feedbackEmail: 'feedback@ourakin.com',
};

export const legalConfig: LegalConfig = {
  ...defaultLegalConfig,
  ...(extra.legal ?? {}),
};

export const supportConfig: SupportConfig = {
  ...defaultSupportConfig,
  ...(extra.support ?? {}),
};

export const appVersion: string = Constants.expoConfig?.version ?? '';
