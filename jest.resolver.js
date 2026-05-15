// jest-expo bundles a resolver that strips `exports` from React Native's
// package.json so jest can mock its subpaths. We only want that behavior for
// the `react-native` package itself — anything else (notably MSW, which
// explicitly maps `react-native: null` in its exports) should go through the
// stock resolver so the `node` export condition is honored.
const rnResolver = require('react-native/jest/resolver.js');

module.exports = (path, options) => {
  if (path === 'react-native' || path.startsWith('react-native/')) {
    return rnResolver(path, options);
  }
  return options.defaultResolver(path, options);
};
