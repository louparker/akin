// Custom Jest transformer that stubs react-native's ViewConfigIgnore.js.
// That file uses Flow `const T:` generic syntax unsupported by @babel/parser 7.28.
// Remove this transformer once Babel adds support for that syntax.
module.exports = {
  process() {
    return {
      code: `
        function DynamicallyInjectedByGestureHandler(object) { return object; }
        function ConditionallyIgnoredEventHandlers(value) { return value; }
        function isIgnored(_value) { return false; }
        module.exports = {
          DynamicallyInjectedByGestureHandler,
          ConditionallyIgnoredEventHandlers,
          isIgnored,
        };
      `,
    };
  },
};
