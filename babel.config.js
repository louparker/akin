module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  // Cache key includes the caller so the Jest (metro/ios) transform doesn't
  // get reused for Metro runtime builds and vice versa.
  const callerKey = api.caller((c) => `${c?.name ?? ''}:${c?.platform ?? ''}`);
  api.cache.using(() => callerKey);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@/components': './src/components',
            '@/features': './src/features',
            '@/lib': './src/lib',
            '@/i18n': './src/i18n',
            '@/theme': './src/theme',
            '@/types': './src/types',
          },
        },
      ],
    ],
  };
};
