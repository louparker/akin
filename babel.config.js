module.exports = function (api) {
  api.cache(true);
  return {
    // nativewind/babel returns { plugins: [...] } — it is a preset factory, not a plugin.
    // Using it in `presets` prevents "[BABEL] .plugins is not a valid Plugin property" errors.
    presets: ['babel-preset-expo', 'nativewind/babel'],
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
