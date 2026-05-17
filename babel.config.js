module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
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
