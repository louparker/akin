module.exports = function (api) {
  api.cache(true);
  // process.env.NODE_ENV is set to 'test' by Jest — safe to read without api.env()
  // because we want cache(true) for speed, and api.env() conflicts with cache(true).
  const isTest = process.env.NODE_ENV === 'test';
  return {
    // nativewind/babel returns { plugins: [...] } — it is a preset factory, not a plugin.
    // Using it in `presets` prevents "[BABEL] .plugins is not a valid Plugin property" errors.
    // Disabled in Jest: the preset inserts react-native-css-interop imports that try to
    // call native modules at module-load time, crashing the Jest/Node runtime.
    // className props are untransformed in tests, which is fine — we test behaviour, not styles.
    presets: ['babel-preset-expo', ...(!isTest ? ['nativewind/babel'] : [])],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
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
