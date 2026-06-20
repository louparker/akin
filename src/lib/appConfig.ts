import Constants from 'expo-constants';

interface LegalConfig {
  privacyUrl: string;
  termsUrl: string;
  guidelinesUrl: string;
}

interface SupportConfig {
  feedbackEmail: string;
}

interface AppExtra {
  legal: LegalConfig;
  support: SupportConfig;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const legalConfig: LegalConfig = extra.legal ?? {
  privacyUrl: '',
  termsUrl: '',
  guidelinesUrl: '',
};

export const supportConfig: SupportConfig = extra.support ?? {
  feedbackEmail: '',
};

export const appVersion: string = Constants.expoConfig?.version ?? '';
