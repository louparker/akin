describe('appConfig', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-constants');
  });

  it('fills missing legal URL fields from defaults when Expo extra is partial', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          version: '9.9.9',
          extra: {
            legal: {
              privacyUrl: 'https://example.com/privacy',
              termsUrl: 'https://example.com/terms',
              guidelinesUrl: 'https://example.com/guidelines',
            },
            support: {},
          },
        },
      },
    }));

    const { legalConfig, supportConfig, appVersion } =
      jest.requireActual<typeof import('../appConfig')>('../appConfig');

    expect(legalConfig).toEqual({
      privacyUrl: 'https://example.com/privacy',
      termsUrl: 'https://example.com/terms',
      guidelinesUrl: 'https://example.com/guidelines',
      dataRequestsUrl: 'https://ourakin.com/privacy/requests',
    });
    expect(supportConfig.feedbackEmail).toBe('feedback@ourakin.com');
    expect(appVersion).toBe('9.9.9');
  });
});
