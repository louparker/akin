// Custom test environment that extends React Native's node env so RN-based
// component tests still get RN globals, but adds the `node` export condition
// first. MSW 2.x explicitly maps its `react-native` export to `null` to opt
// out of RN; without this, jest-resolve can't find `msw/node`.
const RNEnv = require('react-native/jest/react-native-env.js');

module.exports = class AkinTestEnv extends RNEnv {
  constructor(config, context) {
    super(config, context);
    this.customExportConditions = ['node', 'require'];
  }
};
